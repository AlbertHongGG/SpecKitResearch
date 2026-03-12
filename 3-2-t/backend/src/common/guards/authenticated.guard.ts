import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

import { ERROR_CODES } from '../errors/error-codes';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.session?.user) {
      throw new UnauthorizedException({
        code: ERROR_CODES.UNAUTHENTICATED,
        message: 'You must sign in before accessing this resource.',
      });
    }

    return true;
  }
}
