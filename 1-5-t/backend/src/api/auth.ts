import type { FastifyInstance } from 'fastify';
import { LoginRequestSchema } from '@internal/contracts';
import { parseBody } from './validation.js';
import { prisma } from '../db/prisma.js';
import { verifyPassword } from '../auth/password.js';
import { clearSessionCookie, setSessionCookie } from '../auth/session.js';
import { ApiError } from '../observability/errors.js';
import { auditEvents } from '../services/auditEvents.js';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = parseBody(request, LoginRequestSchema);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new ApiError({ statusCode: 401, code: 'Unauthorized', message: 'Invalid credentials' });
    }
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new ApiError({ statusCode: 401, code: 'Unauthorized', message: 'Invalid credentials' });
    }

    await auditEvents.record({ id: user.id, email: user.email, role: user.role }, {
      action: 'Auth.Login',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    });

    setSessionCookie(reply, { id: user.id, email: user.email, role: user.role });
    return reply.send({ user: { id: user.id, email: user.email, role: user.role } });
  });

  app.post('/logout', async (request, reply) => {
    if (request.user) {
      await auditEvents.record(request.user, {
        action: 'Auth.Logout',
        entityType: 'User',
        entityId: request.user.id,
      });
    }

    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get('/me', async (request, reply) => {
    if (!request.user) {
      throw new ApiError({ statusCode: 401, code: 'Unauthorized', message: 'Unauthorized' });
    }
    return reply.send({ user: { id: request.user.id, email: request.user.email, role: request.user.role } });
  });
}
