import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthLoginResponse } from 'src/types';
import { UserRole } from 'generated/prisma/enums';

export class AuthLoginResponseDto implements AuthLoginResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  access_token: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  refresh_token: string;

  @ApiProperty()
  user: {
    id: string;
    role: UserRole;
  };
}
