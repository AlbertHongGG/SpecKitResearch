import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

import { ErrorCodes } from '../../common/errors/error-codes.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SKIP_PATHS = new Set(['/auth/login', '/auth/csrf']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();
    if (SKIP_PATHS.has(req.path)) return next();

    const header = req.header('x-csrf-token') ?? '';
    const cookie = (req as any).cookies?.csrf ?? '';

    if (!header || !cookie || header !== cookie) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'CSRF token missing or invalid',
      });
    }

    next();
  }
}
