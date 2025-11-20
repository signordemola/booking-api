import { UserRole } from 'generated/prisma/enums';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface JwtUser {
  id: string;
  role: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface RequestWithUser extends Request {
  user: JwtUser;
}

export interface AuthResponse {
  statusCode: number;
  message: string;
  error?: string;
}

export interface AuthLoginResponse extends Tokens {
  user: JwtUser;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
