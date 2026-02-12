import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorCodes } from './error-codes';
import type { ErrorResponse } from './error-response';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private extractMessage(payload: unknown, fallback: string): string {
    if (typeof payload === 'string') return payload;
    if (Array.isArray(payload)) return payload.map((v) => String(v)).join('; ');
    if (payload && typeof payload === 'object') {
      const maybeMessage = (payload as { message?: unknown }).message;
      if (Array.isArray(maybeMessage)) return maybeMessage.map((v) => String(v)).join('; ');
      if (typeof maybeMessage === 'string') return maybeMessage;
    }
    return fallback;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers['x-request-id'];

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      const message = this.extractMessage(payload, exception.message);

      const error_code =
        status === 401
          ? ErrorCodes.UNAUTHORIZED
          : status === 403
            ? ErrorCodes.FORBIDDEN
            : status === 404
              ? ErrorCodes.NOT_FOUND
              : status === 409
                ? ErrorCodes.CONFLICT
                : status === 400
                  ? ErrorCodes.VALIDATION_ERROR
                  : ErrorCodes.INTERNAL_ERROR;

      const body: ErrorResponse = {
        error_code,
        message,
        request_id: typeof requestId === 'string' ? requestId : undefined,
        details: typeof payload === 'object' ? payload : undefined,
      };

      response.status(status).json(body);
      return;
    }

    const body: ErrorResponse = {
      error_code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal Server Error',
      request_id: typeof requestId === 'string' ? requestId : undefined,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
