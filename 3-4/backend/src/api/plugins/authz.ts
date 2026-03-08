import type { FastifyPluginAsync } from 'fastify';
import { loadConfig } from '../../lib/config.js';
import { findSessionById, isSessionActive, touchSession } from '../../repositories/sessionRepo.js';
import { findUserById } from '../../repositories/userRepo.js';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: {
      id: string;
      email: string;
      role: 'USER' | 'ADMIN';
    } | null;
    sessionId?: string;
  }
}

export const authzPlugin: FastifyPluginAsync = fp(async (app) => {
  const cfg = loadConfig();

  app.decorateRequest('currentUser', null as any);

  app.addHook('preHandler', async (request) => {
    const sessionId = request.cookies?.[cfg.SESSION_COOKIE_NAME];
    if (!sessionId || typeof sessionId !== 'string') return;

    const session = await findSessionById(sessionId);
    if (!session || !isSessionActive(session)) return;

    const user = await findUserById(session.userId);
    if (!user) return;

    request.sessionId = session.id;
    request.currentUser = { id: user.id, email: user.email, role: user.role };

    await touchSession(session.id, { idleSec: cfg.SESSION_IDLE_SEC, absoluteSec: cfg.SESSION_ABSOLUTE_SEC });
  });
});
