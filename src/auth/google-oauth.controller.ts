import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { GoogleOAuthService } from './google-oauth.service';
import type { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { convertExpiryToMs } from 'src/utils/expiry';
import { AuthLoginResponse } from 'src/types';
import { Throttle } from '@nestjs/throttler';

@Controller('auth/google')
export class GoogleOAuthController {
  constructor(
    private readonly googleService: GoogleOAuthService,
    private readonly configService: ConfigService,
  ) {}

  private clientInfo(req: Request): {
    ipAddress: string | undefined;
    userAgent: string;
  } {
    const ipAddress =
      req.ip ?? req.headers['x-forwarded-for']?.toString() ?? undefined;
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    return { ipAddress, userAgent };
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Get()
  getGoogleAuthUrl(@Res() res: Response) {
    const url = this.googleService.getAuthUrl();
    return res.redirect(url);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Get('callback')
  async googleCallback(
    @Query('code') code: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; data: AuthLoginResponse }> {
    const { ipAddress, userAgent } = this.clientInfo(request);
    const { access_token, refresh_token, user } =
      await this.googleService.handleGoogleLogin(code, ipAddress, userAgent);

    console.log('User data: ', user);
    console.log('Access token: ', access_token);

    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '30m',
    );
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessMaxAge = convertExpiryToMs(accessExpiresIn);
    const refreshMaxAge = convertExpiryToMs(refreshExpiresIn);

    const isProduction = this.configService.get('NODE_ENV') === 'production';

    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: accessMaxAge,
    });

    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: refreshMaxAge,
    });

    return {
      message: 'Successfully signed in with google!',
      data: {
        user,
        access_token,
        refresh_token,
      },
    };
  }
}
