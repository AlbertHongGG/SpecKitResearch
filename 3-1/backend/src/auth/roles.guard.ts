import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '../shared/http/error-codes';
import { ROLES_KEY } from './roles.decorator';
import type { AuthUser, Role } from './types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const roles = req.user?.roles ?? [];
    const ok = required.some((r) => roles.includes(r));
    if (!ok) {
      throw new ForbiddenException({ code: ErrorCodes.FORBIDDEN, message: 'Forbidden' });
    }
    return true;
  }
}
