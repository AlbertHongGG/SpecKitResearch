import type { FastifyReply, FastifyRequest } from 'fastify';
import { ErrorCode, type UserRole } from '@app/contracts';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  if (!request.authUser) {
    const err = new Error('Unauthorized') as Error & { statusCode?: number; code?: string };
    err.statusCode = 401;
    err.code = ErrorCode.UNAUTHORIZED;
    reply.status(401);
    throw err;
  }
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  requireAuth(request, reply);
  if (request.authUser?.role !== 'ADMIN') {
    const err = new Error('Forbidden') as Error & { statusCode?: number; code?: string };
    err.statusCode = 403;
    err.code = ErrorCode.FORBIDDEN;
    reply.status(403);
    throw err;
  }
}
