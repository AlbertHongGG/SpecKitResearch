import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export class RequestIdMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const existing = req.header('x-request-id');
    const requestId = existing && existing.length > 0 ? existing : crypto.randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
