import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, LoginTicket } from 'google-auth-library';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthLoginResponse } from 'src/types';
import { User } from 'generated/prisma/client';

@Injectable()
export class GoogleOAuthService {
  private readonly oauthClient: OAuth2Client;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');

    this.oauthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  getAuthUrl(): string {
    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['profile', 'email'],
    });
  }

  async handleGoogleLogin(
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthLoginResponse> {
    try {
      const { tokens } = await this.oauthClient.getToken(code);

      if (!tokens.id_token) {
        throw new UnauthorizedException(
          'Failed to retrieve ID token from Google',
        );
      }

      const ticket: LoginTicket = await this.oauthClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const googleUserId = payload.sub;
      const email = payload.email;

      const existingAccount = await this.prisma.account.findFirst({
        where: {
          providerId: 'google',
          accountId: googleUserId,
        },
        include: { user: true },
      });

      let user: User;

      if (existingAccount) {
        user = existingAccount.user;
      } else {
        const existingUser = await this.prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          await this.prisma.account.create({
            data: {
              userId: existingUser.id,
              providerId: 'google',
              accountId: googleUserId,
              scope: 'profile email',
              accessToken: null,
              refreshToken: null,
              idToken: null,
            },
          });
          user = existingUser;
        } else {
          user = await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                email,
                firstName: payload.given_name ?? 'User',
                lastName: payload.family_name ?? '',
                image: payload.picture,
                emailVerified: true,
                passwordHash: null,
              },
            });

            await tx.account.create({
              data: {
                userId: newUser.id,
                providerId: 'google',
                accountId: googleUserId,
                scope: 'profile email',
                accessToken: null,
                refreshToken: null,
                idToken: null,
              },
            });

            return newUser;
          });
        }
      }

      const tokensResponse = await this.auth.socialLogin(
        user.id,
        user.role,
        ipAddress,
        userAgent,
      );

      return {
        ...tokensResponse,
        user: {
          id: user.id,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Google OAuth Error:', error);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Google authentication failed');
    }
  }
}
