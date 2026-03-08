import type { FastifyPluginAsync } from 'fastify';
import { ApiError } from '../errors.js';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';

export const errorHandlerPlugin: FastifyPluginAsync = fp(async (app) => {
  app.setErrorHandler((err, request, reply) => {
    const requestId = (request as any).requestId as string | undefined;

    if (err instanceof ApiError) {
      reply.status(err.statusCode).send({
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: requestId,
        },
      });
      return;
    }

    if (err instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: {
            issues: err.issues,
          },
          request_id: requestId,
        },
      });
      return;
    }

    // Avoid logging raw error objects that may contain sensitive data (headers, secrets, payloads).
    request.log.error(
      {
        err: {
          name: err?.name,
          message: err?.message,
          stack: err?.stack,
        },
      },
      'unhandled error'
    );
    reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal Server Error',
        request_id: requestId,
      },
    });
  });
});
