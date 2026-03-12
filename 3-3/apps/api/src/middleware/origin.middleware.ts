import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../common/app-error';

const STATE_CHANGING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function originMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!STATE_CHANGING.has(req.method)) return next();

  // Allow webhooks (no cookies / no browser origin)
  if (req.path.startsWith('/webhooks/')) return next();

  const origin = req.header('origin');
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
  ]);
  for (const value of (process.env.APP_ORIGIN ?? '').split(',')) {
    const parsed = value.trim();
    if (parsed) allowedOrigins.add(parsed);
  }

  const fetchSite = req.header('sec-fetch-site');
  const fetchMode = req.header('sec-fetch-mode');
  if (fetchSite && fetchSite.toLowerCase() === 'cross-site') {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Cross-site request blocked',
    });
  }
  if (
    fetchMode &&
    !['cors', 'same-origin', 'navigate'].includes(fetchMode.toLowerCase())
  ) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Invalid fetch mode',
    });
  }

  if (!origin) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Missing Origin',
    });
  }
  if (!allowedOrigins.has(origin)) {
    throw new AppError({
      errorCode: 'FORBIDDEN',
      status: 403,
      message: 'Origin not allowed',
    });
  }

  next();
}
