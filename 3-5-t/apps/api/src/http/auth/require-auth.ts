import { HttpError } from '../errors';
import type { FastifyReply, FastifyRequest } from 'fastify';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Unauthorized');
  }
}
