import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { RequestWithUser } from 'src/types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user) {
      throw new ForbiddenException('User not authenticated!');
    }

    console.log('🛡 Required roles:', requiredRoles);
    console.log('🧑‍💻 User role:', user.role);

    const hasRole = requiredRoles.some((role) => role === user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied, required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
