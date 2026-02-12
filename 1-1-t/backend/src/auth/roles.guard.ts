import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@prisma/client';
import { ErrorCodes } from '../common/errors/error-codes';
import { ROLES_KEY } from './roles.decorator';
import type { AuthUser } from './auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthUser | undefined;

    if (!user) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Forbidden',
      });
    }

    if (requiredRoles.includes(user.role)) return true;

    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: 'Forbidden',
    });
  }
}
