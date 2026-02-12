import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { HttpError, toErrorResponse } from './httpError.js';

export async function registerErrorHandler(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler(async (err: FastifyError | Error, request, reply) => {
    const requestId = request.id;

    if (err instanceof HttpError) {
      request.log.info(
        { requestId, code: err.code, statusCode: err.statusCode },
        'Request failed',
      );
      return reply
        .code(err.statusCode)
        .send(toErrorResponse({ code: err.code, message: err.message, requestId, details: err.details }));
    }

    if (err instanceof ZodError) {
      request.log.info({ requestId, issues: err.issues }, 'Validation failed');
      return reply.code(400).send(
        toErrorResponse({
          code: 'ValidationFailed',
          message: 'Validation failed',
          requestId,
          details: { issues: err.issues },
        }),
      );
    }

    request.log.error({ requestId, err }, 'Unhandled error');
    return reply.code(500).send(
      toErrorResponse({
        code: 'InternalError',
        message: 'Internal error',
        requestId,
      }),
    );
  });
}
