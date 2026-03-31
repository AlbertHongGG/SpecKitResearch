import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.header('x-request-id');
  const requestId = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}
