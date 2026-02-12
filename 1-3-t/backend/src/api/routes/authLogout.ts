import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../middleware/requireAuth';
import { revokeSession } from '../../infra/auth/sessionStore';

export async function registerAuthLogoutRoute(app: FastifyInstance) {
  app.post('/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const sid = request.auth?.sessionId;
    if (sid) {
      await revokeSession(sid);
    }

    reply.clearCookie('sid', { path: '/' });

    return { ok: true };
  });
}
