import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (process.env.NODE_ENV === 'test' && !(exception instanceof HttpException)) {
      // eslint-disable-next-line no-console
      console.error('Unhandled exception:', exception);
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal Server Error' };

    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray((payload as any).message)
          ? (payload as any).message.join('; ')
          : (payload as any).message ?? 'Error';

    res.status(status).json({
      error: {
        status,
        message,
      },
    });
  }
}
