import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { ERROR_CODES } from '../errors/error-codes';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (SAFE_METHODS.has(request.method)) {
      return true;
    }

    const headerToken = request.header('x-csrf-token');
    const sessionToken = request.session?.csrfToken;
    if (!headerToken || !sessionToken || headerToken !== sessionToken) {
      throw new ForbiddenException({
        code: ERROR_CODES.CSRF_TOKEN_INVALID,
        message: 'CSRF token is missing or invalid.',
      });
    }

    return true;
  }
}
