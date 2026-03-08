import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { getContext } from '../common/request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ctx = getContext(req);

    if (!ctx.user) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Authentication required' });
    }
    return true;
  }
}
