import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id');
  const requestId =
    incoming && incoming.trim().length > 0 ? incoming : randomUUID();

  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  const startedAt = Date.now();
  console.info('[request:start]', {
    requestId,
    method: req.method,
    path: req.originalUrl,
  });

  res.on('finish', () => {
    console.info('[request:finish]', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      elapsedMs: Date.now() - startedAt,
    });
  });

  next();
}
