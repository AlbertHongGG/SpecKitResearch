import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppError } from './app-error';
import { ErrorCodes, ErrorResponseBody } from './error-codes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractMessage(response: unknown, fallback: string): string {
  if (typeof response === 'string') return response;
  if (!isRecord(response)) return fallback;

  const msg = response['message'];
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg) && msg.every((x) => typeof x === 'string'))
    return msg.join('; ');
  return fallback;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = req.requestId;

    if (exception instanceof AppError) {
      const body: ErrorResponseBody = {
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
          request_id: requestId,
        },
      };
      return res.status(exception.status).json(body);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      const message = extractMessage(response, exception.message);

      let code: (typeof ErrorCodes)[keyof typeof ErrorCodes] =
        ErrorCodes.BAD_REQUEST;
      switch (status) {
        case 401:
          code = ErrorCodes.UNAUTHORIZED;
          break;
        case 403:
          code = ErrorCodes.FORBIDDEN;
          break;
        case 404:
          code = ErrorCodes.NOT_FOUND;
          break;
        case 409:
          code = ErrorCodes.CONFLICT;
          break;
        case 429:
          code = ErrorCodes.TOO_MANY_REQUESTS;
          break;
        default:
          code = ErrorCodes.BAD_REQUEST;
      }

      const body: ErrorResponseBody = {
        error: {
          code,
          message,
          details: isRecord(response) ? response : undefined,
          request_id: requestId,
        },
      };

      return res.status(status).json(body);
    }

    const body: ErrorResponseBody = {
      error: {
        code: ErrorCodes.BAD_REQUEST,
        message: 'Unexpected error',
        request_id: requestId,
      },
    };

    return res.status(500).json(body);
  }
}
