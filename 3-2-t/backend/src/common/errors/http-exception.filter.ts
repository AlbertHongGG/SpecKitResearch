import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ERROR_CODES, type ErrorCode, type ErrorResponseBody } from './error-codes';
import { getRequestContext } from '../observability/request-context.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const responseHost = host.switchToHttp();
    const response = responseHost.getResponse<Response>();
    const request = responseHost.getRequest<Request>();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const requestContext = getRequestContext();

    const message =
      typeof rawResponse === 'string'
        ? rawResponse
        : typeof rawResponse === 'object' && rawResponse !== null && 'message' in rawResponse
          ? String(rawResponse.message)
          : exception instanceof Error
            ? exception.message
            : 'Unexpected server error';

    const errorCode: ErrorCode =
      typeof rawResponse === 'object' && rawResponse !== null && 'code' in rawResponse
        ? (String(rawResponse.code) as ErrorCode)
        : statusCode === HttpStatus.UNAUTHORIZED
          ? ERROR_CODES.UNAUTHENTICATED
          : statusCode === HttpStatus.NOT_FOUND
            ? ERROR_CODES.RESOURCE_NOT_FOUND
            : statusCode === HttpStatus.FORBIDDEN
              ? ERROR_CODES.FORBIDDEN
              : ERROR_CODES.INTERNAL_ERROR;

    const body: ErrorResponseBody = {
      statusCode,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId: requestContext.requestId,
    };

    response.status(statusCode).json(body);
  }
}
