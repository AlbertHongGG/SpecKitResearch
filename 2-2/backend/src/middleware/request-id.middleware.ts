import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export function RequestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const existing = req.header('x-request-id');
  const requestId = existing ?? randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
