import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import type { Request, Response } from 'express';
import { ErrorCodes, ErrorMessages } from '../errors/error-codes';
import type { ErrorResponse } from './error-response';

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorCodes.AUTH_REQUIRED;
    case HttpStatus.FORBIDDEN:
      return ErrorCodes.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCodes.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCodes.CONFLICT;
    case HttpStatus.BAD_REQUEST:
      return ErrorCodes.VALIDATION_ERROR;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorMessages.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ErrorMessages.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorMessages.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorMessages.CONFLICT;
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorMessages.VALIDATION_FAILED;
    default:
      return ErrorMessages.INTERNAL_ERROR;
  }
}

function normalizeHttpException(exception: HttpException): {
  status: number;
  body: ErrorResponse;
} {
  const status = exception.getStatus();
  const response = exception.getResponse();

  if (
    typeof response === 'object' &&
    response !== null &&
    'code' in response &&
    'message' in response
  ) {
    const anyResponse = response as any;
    return {
      status,
      body: {
        code: anyResponse.code,
        message: anyResponse.message,
        details: anyResponse.details,
      },
    };
  }

  if (typeof response === 'string') {
    return {
      status,
      body: {
        code: defaultCodeForStatus(status),
        message:
          status === HttpStatus.UNAUTHORIZED ||
          status === HttpStatus.FORBIDDEN ||
          status === HttpStatus.NOT_FOUND ||
          status === HttpStatus.CONFLICT
            ? defaultMessageForStatus(status)
            : response,
      },
    };
  }

  const anyResponse = response as any;
  const message =
    typeof anyResponse?.message === 'string'
      ? anyResponse.message
      : 'Request failed';

  return {
    status,
    body: {
      code: defaultCodeForStatus(status),
      message:
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN ||
        status === HttpStatus.NOT_FOUND ||
        status === HttpStatus.CONFLICT
          ? defaultMessageForStatus(status)
          : message,
      details:
        typeof anyResponse?.message === 'object'
          ? { issues: anyResponse.message }
          : undefined,
    },
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const requestId = (req as any).id;

    if (exception instanceof HttpException) {
      const { status, body } = normalizeHttpException(exception);
      res.status(status).json({ ...body, details: { ...body.details, requestId } });
      return;
    }

    if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        res.status(HttpStatus.CONFLICT).json({
          code: ErrorCodes.CONFLICT,
          message: ErrorMessages.CONFLICT,
          details: { requestId, meta: exception.meta },
        } satisfies ErrorResponse);
        return;
      }

      res.status(HttpStatus.BAD_REQUEST).json({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Database request error',
        details: { requestId, prisma: { code: exception.code, meta: exception.meta } },
      } satisfies ErrorResponse);
      return;
    }

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCodes.INTERNAL_ERROR,
      message: ErrorMessages.INTERNAL_ERROR,
      details: { requestId },
    } satisfies ErrorResponse);
  }
}
