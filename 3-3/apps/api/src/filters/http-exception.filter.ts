import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponse } from '@sb/shared';
import { AppError, isAppError } from '../common/app-error';
import { logForRequest } from '../common/logging/logger';
import { getContext } from '../common/request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const requestId = (() => {
      try {
        return getContext(req)?.requestId;
      } catch {
        return undefined;
      }
    })();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : typeof (response as any)?.message === 'string'
            ? (response as any).message
            : exception.message;

      const body: ErrorResponse = {
        errorCode: status === 401 ? 'AUTH_REQUIRED' : status === 403 ? 'FORBIDDEN' : 'INTERNAL_ERROR',
        message,
        requestId,
      };

      logForRequest(req, {
        level: status >= 500 ? 'error' : 'warn',
        message: 'http_exception',
        errorCode: body.errorCode,
        fields: {
          status,
          path: req.path,
          method: req.method,
        },
        error: exception,
      });
      return res.status(status).json(body);
    }

    if (isAppError(exception)) {
      const e = exception as AppError;
      const body: ErrorResponse = {
        errorCode: e.errorCode,
        message: e.message,
        requestId,
      };

      logForRequest(req, {
        level: e.status >= 500 ? 'error' : 'warn',
        message: 'app_error',
        errorCode: e.errorCode,
        fields: {
          status: e.status,
          path: req.path,
          method: req.method,
        },
      });
      return res.status(e.status).json(body);
    }

    const body: ErrorResponse = {
      errorCode: 'INTERNAL_ERROR',
      message: 'Internal error',
      requestId,
    };

    logForRequest(req, {
      level: 'error',
      message: 'unhandled_exception',
      errorCode: 'INTERNAL_ERROR',
      fields: {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        path: req.path,
        method: req.method,
      },
      error: exception,
    });
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
