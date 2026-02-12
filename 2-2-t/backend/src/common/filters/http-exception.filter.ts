import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CommonErrorMessages, ErrorCodes, makeError } from '@app/contracts';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    const requestId = (req as any).requestId;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'object' && response && 'error' in (response as any)) {
        res.status(status).json(response);
        return;
      }

      res.status(status).json(
        makeError(
          status === HttpStatus.UNAUTHORIZED
            ? ErrorCodes.UNAUTHORIZED
            : status === HttpStatus.FORBIDDEN
              ? ErrorCodes.FORBIDDEN
              : status === HttpStatus.NOT_FOUND
                ? ErrorCodes.NOT_FOUND
                : ErrorCodes.INTERNAL_ERROR,
          (response as any)?.message ?? CommonErrorMessages.internal,
          { requestId },
        ),
      );
      return;
    }

    res.status(500).json(makeError(ErrorCodes.INTERNAL_ERROR, CommonErrorMessages.internal, { requestId }));
  }
}
