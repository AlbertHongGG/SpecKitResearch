import type { FastifyInstance } from 'fastify';
import type { SessionUser } from './session.js';
import { getSessionUserFromRequest } from './session.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

export function registerAuthentication(app: FastifyInstance) {
  app.addHook('preHandler', async (request) => {
    const user = getSessionUserFromRequest(request);
    if (user) {
      request.user = user;
    }
  });
}
