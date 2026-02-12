import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorResponse } from './error-response';

function mapStatusToCode(status: number): ErrorResponse['code'] {
  switch (status as HttpStatus) {
    case HttpStatus.UNAUTHORIZED:
      return 'unauthorized';
    case HttpStatus.FORBIDDEN:
      return 'forbidden';
    case HttpStatus.NOT_FOUND:
      return 'not_found';
    case HttpStatus.CONFLICT:
      return 'conflict';
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return 'validation_error';
    case HttpStatus.BAD_REQUEST:
      return 'bad_request';
    default:
      return 'internal_error';
  }
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      const payload: ErrorResponse = {
        code: mapStatusToCode(status),
        message: exception.message,
        requestId: req.requestId,
      };

      if (typeof response === 'object' && response !== null) {
        const asRecord = response as Record<string, unknown>;
        if (typeof asRecord.message === 'string')
          payload.message = asRecord.message;
        if (asRecord.message && Array.isArray(asRecord.message))
          payload.details = asRecord.message;
        if (asRecord.details) payload.details = asRecord.details;
        if (typeof asRecord.code === 'string')
          payload.code = asRecord.code as ErrorResponse['code'];
      }

      res.status(status).json(payload);
      return;
    }

    const payload: ErrorResponse = {
      code: 'internal_error',
      message: 'Internal server error',
      requestId: req.requestId,
    };
    res.status(500).json(payload);
  }
}
