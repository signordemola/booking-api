import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthLoginResponse, JwtUser } from 'src/types';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { convertExpiryToMs } from 'src/utils/expiry';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private extractRefreshToken(
    req: Request,
    refreshTokenHeader?: string,
  ): string | undefined {
    const cookieToken = req.cookies?.['refresh_token'];
    if (cookieToken) return cookieToken;

    if (refreshTokenHeader) {
      if (refreshTokenHeader.startsWith('Bearer ')) {
        return refreshTokenHeader.substring(7).trim();
      }
      return refreshTokenHeader.trim();
    }

    return undefined;
  }

  private clientInfo(req: Request): {
    ipAddress: string | undefined;
    userAgent: string;
  } {
    const ipAddress =
      req.ip ?? req.headers['x-forwarded-for']?.toString() ?? undefined;
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    return { ipAddress, userAgent };
  }

  @Get()
  async emailandpass() {
    await Promise.resolve();
    return { message: 'email and pass route' };
  }

  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account. Returns success message without tokens. User must login after registration.',
  })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticate user and receive JWT tokens. Tokens are returned in response body and set as httpOnly cookies. Creates a new session with device tracking.',
  })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string; data: AuthLoginResponse }> {
    const { ipAddress, userAgent } = this.clientInfo(request);

    const { access_token, refresh_token, user } = await this.authService.login(
      dto,
      ipAddress,
      userAgent,
    );

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

    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: accessMaxAge,
    });

    response.cookie('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshMaxAge,
    });

    return {
      message: 'Successfully signed in!',
      data: {
        user,
        access_token,
        refresh_token,
      },
    };
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get a new access token using refresh token. Old refresh token is revoked and a new one is issued. Can send refresh token via cookie or Authorization header. No authentication required as access token may be expired.',
  })
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(
    @Req() request: Request,
    @Headers('authorization') authHeader: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refresh_token = this.extractRefreshToken(request, authHeader);
    const { ipAddress, userAgent } = this.clientInfo(request);

    if (!refresh_token) {
      throw new UnauthorizedException('Refresh token not found!');
    }

    const tokens = await this.authService.refreshTokens(
      refresh_token,
      ipAddress,
      userAgent,
    );

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

    response.cookie('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: accessMaxAge,
    });

    response.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: refreshMaxAge,
    });

    return {
      message: 'Token refreshed successfully!',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidate current session and clear authentication cookies. Requires valid access token. Optionally deletes specific session if refresh token is provided.',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logOut(
    @Req() request: Request & { user: JwtUser },
    @Headers('x-refresh-token') authHeader: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refresh_token = this.extractRefreshToken(request, authHeader);

    console.log('Token: ', refresh_token);

    await this.authService.logout(request.user.id, refresh_token);

    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return { message: 'Successfully logged out!' };
  }
}
