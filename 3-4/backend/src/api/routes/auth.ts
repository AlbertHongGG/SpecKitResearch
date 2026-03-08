import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { loadConfig } from '../../lib/config.js';
import { login } from '../../services/auth/AuthService.js';
import { requireAuth } from '../plugins/requireAuth.js';
import { revokeSession } from '../../repositories/sessionRepo.js';
import { findSessionById } from '../../repositories/sessionRepo.js';
import { unauthorized } from '../errors.js';

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  const cfg = loadConfig();

  app.post('/login', async (request, reply) => {
    const body = LoginRequestSchema.parse(request.body);
    const { user, session } = await login(body.email, body.password);

    reply.setCookie(cfg.SESSION_COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: cfg.COOKIE_SECURE,
      path: '/',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      expires_at: session.expiresAtAbsolute.toISOString(),
    };
  });

  app.post('/logout', async (request, reply) => {
    requireAuth(request);
    const sessionId = request.cookies?.[cfg.SESSION_COOKIE_NAME];
    if (typeof sessionId === 'string') {
      await revokeSession(sessionId).catch(() => null);
    }
    reply.clearCookie(cfg.SESSION_COOKIE_NAME, { path: '/' });
    return { ok: true };
  });

  app.get('/session', async (request) => {
    const user = request.currentUser;
    if (!user) throw unauthorized();

    const sessionId = request.sessionId;
    const session = sessionId ? await findSessionById(sessionId) : null;

    return {
      user,
      expires_at: session?.expiresAtAbsolute ? session.expiresAtAbsolute.toISOString() : null,
    };
  });
};
