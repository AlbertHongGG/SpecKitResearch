import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type BaseErrorBody = { code: string; message: string; request_id: string };
type ValidationErrorBody = BaseErrorBody & { errors: Array<{ path: string; message: string }> };

function isValidationErrorItem(value: unknown): value is { path: string; message: string } {
  if (!value || typeof value !== 'object') return false;
  const rec = value as Record<string, unknown>;
  return typeof rec.path === 'string' && typeof rec.message === 'string';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const requestId = req.requestId ?? 'req_unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();

      if (typeof resp === 'object' && resp !== null && 'code' in resp) {
        const body = resp as Record<string, unknown>;
        const code = typeof body.code === 'string' ? body.code : 'HTTP_ERROR';
        const message = typeof body.message === 'string' ? body.message : exception.message || 'Request failed';

        if (code === 'VALIDATION_ERROR' && Array.isArray(body.errors)) {
          const errors = (body.errors as Array<unknown>).filter(isValidationErrorItem).map(({ path, message }) => ({
            path,
            message,
          }));
          const out: ValidationErrorBody = { code, message, request_id: requestId, errors };
          res.status(status).json(out);
          return;
        }

        const out: BaseErrorBody = { code, message, request_id: requestId };
        res.status(status).json(out);
        return;
      }

      const code =
        status === HttpStatus.UNAUTHORIZED
          ? 'UNAUTHORIZED'
          : status === HttpStatus.FORBIDDEN
            ? 'FORBIDDEN'
            : status === HttpStatus.NOT_FOUND
              ? 'NOT_FOUND'
              : status === HttpStatus.CONFLICT
                ? 'CONFLICT'
                : status === HttpStatus.TOO_MANY_REQUESTS
                  ? 'TOO_MANY_REQUESTS'
                  : 'HTTP_ERROR';
      const out: BaseErrorBody = { code, message: exception.message || 'Request failed', request_id: requestId };
      res.status(status).json(out);
      return;
    }

    // Preserve server-side stack traces in logs while still returning a safe envelope.
    console.error('Unhandled exception', { requestId }, exception);
    const out: BaseErrorBody = { code: 'INTERNAL_ERROR', message: 'Internal error', request_id: requestId };
    res.status(500).json(out);
  }
}
