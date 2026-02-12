import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();

    (req as any).id = id;
    res.setHeader('X-Request-Id', id);

    next();
}
