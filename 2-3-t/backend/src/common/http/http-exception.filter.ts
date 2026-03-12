import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { ErrorCodes, errorCodeFromHttpStatus } from './error-codes';
import { makeErrorResponse } from './error-response';
import { getConfig } from '../config/config';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    const requestId = request?.id ?? request?.headers?.['x-request-id'];

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as any)?.message ?? exception.message;

      const code =
        status === HttpStatus.TOO_MANY_REQUESTS ? ErrorCodes.RATE_LIMITED : errorCodeFromHttpStatus(status);

      reply.status(status).send(makeErrorResponse(code, String(message), requestId));
      return;
    }

    // Do not leak internal error details to clients, but keep them visible
    // during development and in tests.
    try {
      const config = getConfig(process.env);
      if (config.nodeEnv !== 'production') {
        // eslint-disable-next-line no-console
        console.error(exception);
      }
    } catch {
      // ignore
    }

    reply
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(makeErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Internal error', requestId));
  }
}
