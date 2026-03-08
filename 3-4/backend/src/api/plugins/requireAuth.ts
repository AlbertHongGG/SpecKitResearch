import type { FastifyRequest } from 'fastify';
import { unauthorized, forbidden } from '../errors.js';

export function requireAuth(request: FastifyRequest) {
  if (!request.currentUser) throw unauthorized();
  return request.currentUser;
}

export function requireAdmin(request: FastifyRequest) {
  const user = requireAuth(request);
  if (user.role !== 'ADMIN') throw forbidden();
  return user;
}
