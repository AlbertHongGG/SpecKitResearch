import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/app-error';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function originMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!STATE_CHANGING.has(req.method)) return next();

  // Allow webhooks (no cookies / no browser origin)
  if (req.path.startsWith('/webhooks/')) return next();

  const origin = req.header('origin');
  const expected = process.env.APP_ORIGIN;

  const fetchSite = req.header('sec-fetch-site');
  const fetchMode = req.header('sec-fetch-mode');
  if (fetchSite && fetchSite.toLowerCase() === 'cross-site') {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Cross-site request blocked',
    });
  }
  if (fetchMode && !['cors', 'same-origin', 'navigate'].includes(fetchMode.toLowerCase())) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Invalid fetch mode',
    });
  }

  if (!expected) return next();
  if (!origin) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Missing Origin',
    });
  }
  if (origin !== expected) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Origin not allowed',
    });
  }

  next();
}
