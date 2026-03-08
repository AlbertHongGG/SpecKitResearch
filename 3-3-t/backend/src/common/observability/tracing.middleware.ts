import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export type TracedRequest = Request & {
  requestId?: string;
  traceId?: string;
  correlationId?: string;
  orgId?: string;
  userId?: string;
  role?: string;
};

export function tracingMiddleware(req: TracedRequest, _res: Response, next: NextFunction) {
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.traceId = (req.headers['x-trace-id'] as string) || req.requestId;
  req.correlationId = (req.headers['x-correlation-id'] as string) || req.traceId;
  next();
}
