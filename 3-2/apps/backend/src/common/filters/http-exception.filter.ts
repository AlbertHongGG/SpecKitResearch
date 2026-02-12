import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErrorCodes } from '../errors/error-codes.js';
import type { RequestWithRequestId } from '../middleware/request-id.middleware.js';

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<RequestWithRequestId>();

    const requestId = req.requestId ?? 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse() as any;

      const message =
        typeof response === 'string'
          ? response
          : (response?.message && Array.isArray(response.message)
              ? response.message.join(', ')
              : response?.message) ?? exception.message;

      const code = response?.code ??
        (status === HttpStatus.UNAUTHORIZED
          ? ErrorCodes.UNAUTHORIZED
          : status === HttpStatus.FORBIDDEN
            ? ErrorCodes.FORBIDDEN
            : status === HttpStatus.NOT_FOUND
              ? ErrorCodes.NOT_FOUND
              : status === HttpStatus.CONFLICT
                ? ErrorCodes.CONFLICT
                : ErrorCodes.INTERNAL_ERROR);

      const body: ErrorResponse = {
        error: {
          code,
          message,
          requestId,
        },
      };

      res.status(status).json(body);
      return;
    }

    const body: ErrorResponse = {
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal Server Error',
        requestId,
      },
    };

    res.status(500).json(body);
  }
}
