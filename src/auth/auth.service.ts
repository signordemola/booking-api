import {
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { hashPassword, verifyPassword } from 'src/utils/password';
import { AuthResponse, AuthLoginResponse, JwtPayload, Tokens } from 'src/types';
import { LoginDto } from './dto/login.dto';
import { hashToken } from 'src/utils/token';
import { convertExpiryToMs } from 'src/utils/expiry';

const MAX_SESSIONS_PER_USER = 2;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private generateTokens(payload: { id: string; role: string }): Tokens {
    const jwtPayload = { sub: payload.id, role: payload.role };

    const access_token: string = this.jwtService.sign(jwtPayload, {
      secret: this.configService.get<string>('JWT_SECRET_KEY'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '30m'),
    });

    const refresh_token: string = this.jwtService.sign(jwtPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      access_token,
      refresh_token,
    };
  }

  private getRefreshTokenExpiry(): Date {
    const expiresIn: string = this.configService.get(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const ms = convertExpiryToMs(expiresIn);
    return new Date(Date.now() + ms);
  }

  private async createAndLimitSessions(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const hashed = hashToken(refreshToken);
    const expiry = this.getRefreshTokenExpiry();

    await this.prisma.$transaction(async (tx) => {
      await tx.session.create({
        data: {
          userId,
          token: hashed,
          expiresAt: expiry,
          ipAddress,
          userAgent,
        },
      });

      const allActiveSessions = await tx.session.findMany({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });

      if (allActiveSessions.length > MAX_SESSIONS_PER_USER) {
        const sessionsToRevoke = allActiveSessions.slice(MAX_SESSIONS_PER_USER);

        const sessionIdsToRevoke = sessionsToRevoke.map((s) => s.id);

        if (sessionIdsToRevoke.length > 0) {
          await tx.session.updateMany({
            where: { id: { in: sessionIdsToRevoke } },
            data: { revokedAt: new Date() },
          });
        }
      }
    });
  }

  private async cleanupExpiredAndRevokedSessions(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    });
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered!');
    }

    const hash = await hashPassword(dto.password);

    await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName.toLocaleLowerCase().trim(),
        lastName: dto.lastName.toLocaleLowerCase().trim(),
        passwordHash: hash,
        phoneNumber: dto.phoneNumber,
      },
    });

    return {
      statusCode: HttpStatus.CREATED,
      message: 'User registered successfully!',
    };
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthLoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email.toLocaleLowerCase().trim(),
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials!');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses social login. Please sign in with Google!',
      );
    }

    const isPasswordValid: boolean = await verifyPassword(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials!');
    }

    await this.cleanupExpiredAndRevokedSessions();

    const tokens = this.generateTokens({
      id: user.id,
      role: user.role,
    });

    await this.createAndLimitSessions(
      user.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user: { id: user.id, role: user.role },
    };
  }

  async refreshTokens(
    refresh_token: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Tokens> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refresh_token,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      if (!payload) {
        throw new UnauthorizedException('Invalid refresh token!');
      }

      const hashedRefresh = hashToken(refresh_token);
      const session = await this.prisma.session.findUnique({
        where: { token: hashedRefresh },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          revokedAt: true,
          ipAddress: true,
          userAgent: true,
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid session!');
      }

      if (session.revokedAt) {
        throw new UnauthorizedException('Session has been revoked!');
      }

      if (session.expiresAt < new Date()) {
        await this.prisma.session.delete({ where: { id: session.id } });
        throw new UnauthorizedException('Session expired!');
      }

      if (session.userId !== payload.sub) {
        throw new UnauthorizedException('Token mismatch!');
      }

      await this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });

      await this.cleanupExpiredAndRevokedSessions();

      const newTokens = this.generateTokens({
        id: session.user.id,
        role: session.user.role,
      });

      await this.createAndLimitSessions(
        session.user.id,
        newTokens.refresh_token,
        ipAddress,
        userAgent,
      );

      return newTokens;
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Invalid refresh token!');
    }
  }

  async logout(userId: string, refresh_token?: string): Promise<void> {
    if (refresh_token) {
      const hashedToken = hashToken(refresh_token);
      await this.prisma.session.deleteMany({
        where: {
          userId,
          token: hashedToken,
        },
      });
    }
  }

  async socialLogin(
    userId: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthLoginResponse> {
    await this.cleanupExpiredAndRevokedSessions();

    const tokens = this.generateTokens({ id: userId, role });

    await this.createAndLimitSessions(
      userId,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

    return { ...tokens, user: { id: userId, role } };
  }

  async getUserSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });
  }

  async revokeOtherSessions(
    userId: string,
    currentRefreshToken: string,
  ): Promise<void> {
    const hashedToken = hashToken(currentRefreshToken);
    await this.prisma.session.deleteMany({
      where: {
        userId,
        token: { not: hashedToken },
      },
    });
  }

  async cleanupOldSessions(): Promise<void> {
    // Delete sessions that are either:
    // 1. Expired for more than 7 days, OR
    // 2. Revoked for more than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.deleteMany({
      where: {
        OR: [
          {
            expiresAt: { lt: sevenDaysAgo },
          },
          {
            revokedAt: { lt: sevenDaysAgo },
          },
        ],
      },
    });
  }
}
