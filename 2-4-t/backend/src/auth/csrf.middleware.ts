import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { loadEnv } from '../shared/config/env';

const UNSAFE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly env = loadEnv();

  use(req: Request, _res: Response, next: NextFunction) {
    if (!UNSAFE_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    // Allow login without session-bound CSRF.
    if (req.path === '/login') {
      next();
      return;
    }

    const allowedOrigins = (this.env.ALLOWED_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const origin = req.header('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('CSRF: invalid origin');
    }

    const fetchSite = req.header('sec-fetch-site');
    if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
      throw new ForbiddenException('CSRF: invalid fetch site');
    }

    const session = (req as any).session as { csrfToken: string } | null;
    if (!session) {
      // For endpoints that require auth, this will become 401 by guard.
      next();
      return;
    }

    const token = req.header('x-csrf-token');
    if (!token || token !== session.csrfToken) {
      throw new ForbiddenException('CSRF: token mismatch');
    }

    next();
  }
}
