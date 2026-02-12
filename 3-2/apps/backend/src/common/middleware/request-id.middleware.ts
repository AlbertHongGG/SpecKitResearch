import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

export type RequestWithRequestId = Request & { requestId?: string };

export class RequestIdMiddleware {
  use(req: RequestWithRequestId, res: Response, next: NextFunction) {
    const existing = req.header(REQUEST_ID_HEADER) ?? undefined;
    const requestId = existing || randomUUID();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
