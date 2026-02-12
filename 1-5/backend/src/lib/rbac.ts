import type { FastifyRequest } from 'fastify';
import { forbidden } from './httpError.js';
import { requireAuth } from './authMiddleware.js';

export function requireRole(roles: Array<'User' | 'Reviewer' | 'Admin'>) {
  return async function rbacPreHandler(request: FastifyRequest) {
    const user = await requireAuth(request);
    if (!roles.includes(user.role)) throw forbidden();
  };
}
