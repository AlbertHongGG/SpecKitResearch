import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';

export class RequestIdMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
    (req as any).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
