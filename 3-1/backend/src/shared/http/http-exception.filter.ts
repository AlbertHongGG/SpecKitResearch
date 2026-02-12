import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ErrorCodes, type ErrorResponse } from './error-codes';
import type { RequestWithRequestId } from './request-id.middleware';
import { logger } from '../observability/logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithRequestId>();
    const requestId = req.requestId ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();
      const payload: ErrorResponse = {
        requestId,
        error: {
          code: (responseBody as any)?.code ?? mapStatusToCode(status),
          message: (responseBody as any)?.message ?? exception.message,
          details: (responseBody as any)?.details,
        },
      };
      return res.status(status).json(payload);
    }

    logger.error('Unhandled exception', { requestId, exception: String(exception) });
    const payload: ErrorResponse = {
      requestId,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal Server Error',
      },
    };
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(payload);
  }
}

function mapStatusToCode(status: number) {
  if (status === 401) return ErrorCodes.UNAUTHORIZED;
  if (status === 403) return ErrorCodes.FORBIDDEN;
  if (status === 404) return ErrorCodes.NOT_FOUND;
  if (status === 409) return ErrorCodes.CONFLICT;
  if (status === 422) return ErrorCodes.VALIDATION_FAILED;
  if (status === 429) return ErrorCodes.RATE_LIMITED;
  return ErrorCodes.INTERNAL_ERROR;
}
