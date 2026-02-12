import type { FastifyReply, FastifyRequest } from 'fastify';

import { AppError } from '../http/errors';

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (request.auth && request.auth.user) return;

  throw new AppError({
    code: 'AUTH_REQUIRED',
    status: 401,
    message: '請先登入',
  });
}
