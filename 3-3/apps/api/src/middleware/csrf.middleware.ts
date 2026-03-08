import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { AppError } from '../common/app-error';
import { csrfCookieOptions } from '../modules/auth/cookie.config';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_COOKIE = 'csrfToken';

export function issueCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, csrfCookieOptions());
  return token;
}

export function csrfMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!STATE_CHANGING.has(req.method)) return next();
  if (req.path.startsWith('/webhooks/')) return next();
  if (req.path === '/auth/login' || req.path === '/auth/signup') return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'CSRF validation failed',
    });
  }

  next();
}
