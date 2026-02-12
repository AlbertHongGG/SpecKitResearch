import type { FastifyInstance } from 'fastify';

import { clearAuthCookies } from '../../lib/cookies.js';
import { config, isProd } from '../../lib/config.js';

export async function registerLogoutRoute(app: FastifyInstance): Promise<void> {
  app.post('/auth/logout', async (request, reply) => {
    clearAuthCookies(reply);
    reply.clearCookie(config.CSRF_COOKIE_NAME, {
      path: '/',
      secure: config.COOKIE_SECURE || isProd,
    });

    return reply.send({ ok: true });
  });
}
