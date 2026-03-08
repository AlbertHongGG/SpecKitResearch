import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ErrorCode } from '@app/contracts';
import { parseBody } from '../../lib/validate';
import { verifyPassword } from '../../domain/auth/password';
import { clearSessionCookie, setSessionCookie } from '../../domain/auth/cookie';

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/login',
    {
      preHandler: app.rateLimit({ key: 'auth.login', limit: 10, windowMs: 60_000 }),
    },
    async (request, reply) => {
    const body = parseBody(request, LoginBodySchema);

    const user = await app.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      reply.status(401);
      throw Object.assign(new Error('Invalid credentials'), {
        statusCode: 401,
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    const ok = await verifyPassword(user.password_hash, body.password);
    if (!ok) {
      reply.status(401);
      throw Object.assign(new Error('Invalid credentials'), {
        statusCode: 401,
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    const session = await app.sessionService.createSession({ userId: user.id });
    await app.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    setSessionCookie({
      reply,
      cookieName: app.config.SESSION_COOKIE_NAME,
      sid: session.sid,
      expiresAt: session.expires_at,
      nodeEnv: app.config.NODE_ENV,
    });

    return {
      ok: true,
      requestId: request.id,
      data: {
        authenticated: true,
        email: user.email,
        role: user.role,
      },
    };
    },
  );

  app.post('/logout', async (request, reply) => {
    if (request.sessionId) {
      await app.sessionService.revokeSession(request.sessionId);
    }
    clearSessionCookie({
      reply,
      cookieName: app.config.SESSION_COOKIE_NAME,
      nodeEnv: app.config.NODE_ENV,
    });
    return { ok: true, requestId: request.id, data: { authenticated: false } };
  });

  app.get('/me', async (request) => {
    if (!request.authUser) {
      return { ok: true, requestId: request.id, data: { authenticated: false } };
    }
    return {
      ok: true,
      requestId: request.id,
      data: {
        authenticated: true,
        email: request.authUser.email,
        role: request.authUser.role,
      },
    };
  });
};

