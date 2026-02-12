import type { FastifyRequest } from 'fastify';
import { ApiError } from '../observability/errors.js';
import type { SessionUser } from './session.js';

export function requireRole(roles: Array<SessionUser['role']>) {
  return async (request: FastifyRequest) => {
    const user = (request as any).user as SessionUser | undefined;
    if (!user) {
      throw new ApiError({ statusCode: 401, code: 'Unauthorized', message: 'Unauthorized' });
    }
    if (!roles.includes(user.role)) {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'Forbidden' });
    }
  };
}
