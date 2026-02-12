import type { FastifyRequest } from 'fastify';
import { z, type ZodTypeAny } from 'zod';
import { ApiError } from '../observability/errors.js';

export function parseBody<T extends ZodTypeAny>(request: FastifyRequest, schema: T): z.infer<T> {
  const result = schema.safeParse((request as any).body);
  if (!result.success) {
    throw new ApiError({
      statusCode: 400,
      code: 'ValidationError',
      message: 'Invalid request body',
      details: result.error.flatten(),
    });
  }
  return result.data;
}

export function parseParams<T extends ZodTypeAny>(request: FastifyRequest, schema: T): z.infer<T> {
  const result = schema.safeParse((request as any).params);
  if (!result.success) {
    throw new ApiError({
      statusCode: 400,
      code: 'ValidationError',
      message: 'Invalid request params',
      details: result.error.flatten(),
    });
  }
  return result.data;
}

export function parseQuery<T extends ZodTypeAny>(request: FastifyRequest, schema: T): z.infer<T> {
  const result = schema.safeParse((request as any).query);
  if (!result.success) {
    throw new ApiError({
      statusCode: 400,
      code: 'ValidationError',
      message: 'Invalid request query',
      details: result.error.flatten(),
    });
  }
  return result.data;
}
