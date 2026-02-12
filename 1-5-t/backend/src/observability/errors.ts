import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'ValidationError'
  | 'Unauthorized'
  | 'Forbidden'
  | 'NotFound'
  | 'Conflict'
  | 'InternalError';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(params: { statusCode: number; code: ErrorCode; message: string; details?: unknown }) {
    super(params.message);
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = (request as any).requestId ?? 'unknown';

    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message, details: error.details, requestId },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'ValidationError',
          message: 'Invalid request',
          details: error.flatten(),
          requestId,
        },
      });
    }

    request.log.error({ err: error, requestId }, 'Unhandled error');
    return reply.status(500).send({
      error: { code: 'InternalError', message: 'Internal error', requestId },
    });
  });
}
