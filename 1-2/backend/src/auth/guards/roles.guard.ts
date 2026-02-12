import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY, type Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!roles || roles.length === 0) return true;

        const req = context.switchToHttp().getRequest<Request>();
        const role = (req as any).user?.role as Role | undefined;
        if (!role) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
        }

        if (!roles.includes(role)) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
        }

        return true;
    }
}
