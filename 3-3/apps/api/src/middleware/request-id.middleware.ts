import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { setContext } from '../common/request-context';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId =
    (typeof req.header('x-request-id') === 'string' && req.header('x-request-id')) || randomUUID();

  setContext(req, { requestId });
  res.setHeader('X-Request-Id', requestId);
  next();
}
