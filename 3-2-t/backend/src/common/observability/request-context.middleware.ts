import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export interface RequestContextStore {
  requestId: string;
  startedAt: number;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function getRequestContext(): RequestContextStore {
  return requestContextStorage.getStore() ?? {
    requestId: 'unknown',
    startedAt: Date.now(),
  };
}

export function requestContextMiddleware(request: Request, response: Response, next: NextFunction): void {
  const requestId = request.header('x-request-id') ?? randomUUID();
  const store: RequestContextStore = {
    requestId,
    startedAt: Date.now(),
  };

  response.setHeader('x-request-id', requestId);
  requestContextStorage.run(store, next);
}
