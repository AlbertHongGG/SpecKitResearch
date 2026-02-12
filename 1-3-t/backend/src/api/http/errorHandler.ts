import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { AppError, isAppError, makeErrorResponse } from './errors';

export async function registerErrorHandler(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    const requestId = request.requestId ?? 'unknown';

    reply.status(404).send(
      makeErrorResponse({
        code: 'NOT_FOUND',
        message: '找不到資源',
        requestId,
      }),
    );
  });

  app.setErrorHandler((error, request, reply) => {
    const requestId = request.requestId ?? 'unknown';

    if (error instanceof ZodError) {
      reply.status(400).send(
        makeErrorResponse({
          code: 'VALIDATION_ERROR',
          message: '請確認輸入內容',
          requestId,
          details: {
            issues: error.issues,
          },
        }),
      );
      return;
    }

    if (isAppError(error)) {
      reply.status(error.status).send(
        makeErrorResponse({
          code: error.code,
          message: error.message,
          requestId,
          details: error.details,
        }),
      );
      return;
    }

    // Fastify 404 will be handled by routes; this is for unexpected errors.
    app.log.error({ err: error, requestId }, 'Unhandled error');

    const publicMessage = '系統發生錯誤，請稍後再試';
    const appError = new AppError({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: publicMessage,
    });

    reply.status(appError.status).send(
      makeErrorResponse({
        code: appError.code,
        message: appError.message,
        requestId,
      }),
    );
  });
}
