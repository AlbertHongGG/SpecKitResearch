import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { requestId?: string };

export function requestIdMiddleware(
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) {
  const headerValue = req.header('x-request-id');
  const requestId =
    headerValue && headerValue.trim() ? headerValue.trim() : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}
