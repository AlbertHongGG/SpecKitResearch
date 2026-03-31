import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

import { ErrorCodes } from '../errors/error-codes';

type HttpExceptionResponseBody =
  | string
  | {
      code?: string;
      message?: unknown;
      error?: string;
    }
  | Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ErrorCodes.BAD_REQUEST;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCodes.UNAUTHORIZED;
    case HttpStatus.FORBIDDEN:
      return ErrorCodes.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCodes.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCodes.CONFLICT;
    default:
      return ErrorCodes.INTERNAL_SERVER_ERROR;
  }
}

function normalizeMessage(msg: unknown): string {
  if (typeof msg === 'string' && msg.length > 0) return msg;
  return '發生錯誤，請稍後再試。';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    const requestId = isRecord(res.locals) ? res.locals.requestId : undefined;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as HttpExceptionResponseBody;

      // Only return custom messages when the exception explicitly sets an application error code.
      // This avoids leaking default NestJS messages or unexpected payloads.
      const hasExplicitCode = isRecord(body) && typeof body.code === 'string';

      const code = hasExplicitCode ? body.code : defaultCodeForStatus(status);

      const message =
        hasExplicitCode && isRecord(body) && 'message' in body
          ? normalizeMessage(body.message)
          : normalizeMessage(undefined);

      res.status(status).json({
        error: {
          code,
          message,
          requestId: typeof requestId === 'string' ? requestId : 'unknown',
        },
      });
      return;
    }

    // Unexpected error: log server-side details, keep client response generic.
    console.error('Unhandled exception', {
      requestId: typeof requestId === 'string' ? requestId : 'unknown',
      exception,
    });

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: '系統發生非預期錯誤，請稍後再試。',
        requestId: typeof requestId === 'string' ? requestId : 'unknown',
      },
    });
  }
}
