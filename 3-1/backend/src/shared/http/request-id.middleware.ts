import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';

export type RequestWithRequestId = Request & { requestId?: string };

export class RequestIdMiddleware {
  use(req: RequestWithRequestId, res: Response, next: NextFunction) {
    const existing = req.header('x-request-id');
    const requestId = existing && existing.trim() ? existing.trim() : crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
