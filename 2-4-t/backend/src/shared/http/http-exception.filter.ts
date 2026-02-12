import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';
import { mapInternalErrorToHttp } from './error-mapping';

type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL';

function mapStatusToCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'TOO_MANY_REQUESTS';
    default:
      return 'INTERNAL';
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<ExpressResponse>();
    const req = ctx.getRequest<ExpressRequest>();

    const requestId = (req as any).requestId as string | undefined;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;
      const message = typeof body === 'string' ? body : body?.message ?? exception.message;
      res.status(status).json({
        error: {
          code: mapStatusToCode(status),
          message,
          request_id: requestId ?? null,
          details: body?.details ?? null
        }
      });
      return;
    }

    const mapped = mapInternalErrorToHttp(exception);
    if (mapped) {
      const requestId = (req as any).requestId as string | undefined;
      res.status(mapped.status).json({
        error: {
          code: mapStatusToCode(mapped.status),
          message: mapped.message,
          request_id: requestId ?? null,
          details: mapped.details
        }
      });
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL',
        message: 'Internal server error',
        request_id: requestId ?? null,
        details: null
      }
    });
  }
}
