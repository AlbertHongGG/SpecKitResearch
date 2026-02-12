import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { isDomainError, isHttpError } from '../errors/errors';
import { toErrorResponse } from '../errors/errorResponse';
import { logger } from '../observability/logger';
import { createRequestId } from '../observability/requestId';

export type RouteContext = {
  requestId: string;
};

export function withRouteHandler(
  handler: (req: NextRequest, ctx: RouteContext) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    const requestId = createRequestId();

    try {
      const res = await handler(req, { requestId });
      res.headers.set('x-request-id', requestId);
      return res;
    } catch (err) {
      if (isHttpError(err)) {
        logger.warn('http_error', {
          requestId,
          route: req.nextUrl.pathname,
          errorCode: err.code,
        });
        const body = toErrorResponse({
          code: err.code,
          message: err.message,
          requestId,
          details: err.details,
        });
        return NextResponse.json(body, { status: err.status, headers: { 'x-request-id': requestId } });
      }

      if (isDomainError(err)) {
        logger.warn('domain_error', {
          requestId,
          route: req.nextUrl.pathname,
          errorCode: err.code,
        });
        const body = toErrorResponse({
          code: err.code,
          message: err.message,
          requestId,
          details: err.details,
        });
        return NextResponse.json(body, { status: 400, headers: { 'x-request-id': requestId } });
      }

      logger.error('unhandled_error', { requestId, route: req.nextUrl.pathname }, err);
      const body = toErrorResponse({
        code: 'INTERNAL_ERROR',
        message: '伺服器錯誤',
        requestId,
      });
      return NextResponse.json(body, { status: 500, headers: { 'x-request-id': requestId } });
    }
  };
}
