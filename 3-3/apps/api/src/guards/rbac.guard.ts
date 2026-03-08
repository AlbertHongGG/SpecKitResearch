import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { getContext } from '../common/request-context';
import { ORG_ROLE_KEY } from './rbac.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<'END_USER' | 'ORG_ADMIN' | undefined>(
      ORG_ROLE_KEY,
      context.getHandler(),
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const ctx = getContext(req);

    if (!ctx.org) {
      throw new AppError({ errorCode: 'FORBIDDEN', status: 403, message: 'Organization context required' });
    }

    if (required === 'ORG_ADMIN' && ctx.org.role !== 'ORG_ADMIN') {
      throw new AppError({ errorCode: 'FORBIDDEN', status: 403, message: 'Org admin required' });
    }

    return true;
  }
}
