import type { FastifyRequest } from 'fastify';
import { ErrorCode } from '@app/contracts';
import type { Env } from '../config/env';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfMiddleware(env: Env) {
  return async (request: FastifyRequest) => {
    if (!UNSAFE_METHODS.has(request.method)) return;

    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const allowed = env.CORS_ORIGIN;

    if (!origin && !referer) {
      // Allow non-browser clients (Fastify inject/tests). In production, rely on Origin.
      return;
    }

    const ok = (origin && origin === allowed) || (referer && referer.startsWith(allowed));
    if (!ok) {
      const err = new Error('CSRF check failed');
      (err as Error & { statusCode?: number }).statusCode = 403;
      (err as Error & { code?: string }).code = ErrorCode.CSRF_FAILED;
      throw err;
    }
  };
}
