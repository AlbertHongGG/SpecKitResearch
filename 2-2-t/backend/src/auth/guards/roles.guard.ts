import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { ErrorCodes } from '../../common/errors/error-codes';
import type { UserRole } from '../../generated/prisma/client';

import type { CurrentUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestWithUser = Request & { user?: CurrentUser };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const role = req.user?.role;

    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Forbidden.',
      });
    }

    return true;
  }
}
