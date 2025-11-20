import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtStrategy } from './strategy/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleOAuthService } from './google-oauth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET_KEY'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '1h') as any,
        },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController, GoogleOAuthController],
  providers: [AuthService, GoogleOAuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
