import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ErrorCodes } from '../lib/error-codes.js';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const requestId = request.headers['x-request-id'];

    if (exception instanceof HttpException) {
      const httpException = exception as HttpException;
      const status = httpException.getStatus();
      const message = (httpException.getResponse() as { message?: string })?.message ??
        httpException.message;
      response.status(status).json({
        code: this.mapStatus(status),
        message,
        requestId,
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: ErrorCodes.INTERNAL,
      message: 'Internal server error',
      requestId,
    });
  }

  private mapStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.CONFLICT;
      default:
        return ErrorCodes.INTERNAL;
    }
  }
}
