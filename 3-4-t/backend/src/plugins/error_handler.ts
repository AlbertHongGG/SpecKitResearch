import type { FastifyPluginAsync } from 'fastify';
import { ZodError } from 'zod';
import { ErrorCode } from '@app/contracts';

type ErrorWithStatusCode = Error & { statusCode?: number; code?: string };

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler(async (error: ErrorWithStatusCode, request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400);
      return {
        ok: false,
        requestId: request.id,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation error',
          fieldErrors: error.flatten().fieldErrors,
        },
      };
    }

    const statusCode = error.statusCode ?? 500;
    const hintedCode = error.code;
    const code = hintedCode && Object.values(ErrorCode).includes(hintedCode as any)
      ? (hintedCode as (typeof ErrorCode)[keyof typeof ErrorCode])
      : statusCode === 401
      ? ErrorCode.UNAUTHORIZED
      : statusCode === 403
        ? ErrorCode.FORBIDDEN
        : statusCode === 404
          ? ErrorCode.NOT_FOUND
          : statusCode === 409
            ? ErrorCode.CONFLICT
            : statusCode === 429
              ? ErrorCode.RATE_LIMITED
              : statusCode >= 400 && statusCode < 500
                ? ErrorCode.BAD_REQUEST
                : ErrorCode.INTERNAL_ERROR;

    reply.status(statusCode);
    return {
      ok: false,
      requestId: request.id,
      error: {
        code,
        message: statusCode >= 500 ? 'Internal server error' : error.message,
      },
    };
  });
};
