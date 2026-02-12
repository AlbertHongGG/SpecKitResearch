import type { FastifyInstance } from 'fastify';

import { requireAuth } from '../../lib/authMiddleware.js';
import { config } from '../../lib/config.js';
import { issueCsrfToken } from '../../lib/csrf.js';

export async function registerMeRoute(app: FastifyInstance): Promise<void> {
  app.get('/auth/me', async (request, reply) => {
    const user = await requireAuth(request);

    const csrfCookie = (request.cookies as Record<string, unknown>)[config.CSRF_COOKIE_NAME];
    if (typeof csrfCookie !== 'string' || csrfCookie.length === 0) {
      issueCsrfToken(reply);
    }

    return reply.send({ id: user.id, email: user.email, role: user.role });
  });
}
