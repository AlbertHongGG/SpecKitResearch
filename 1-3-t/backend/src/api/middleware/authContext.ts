import type { FastifyInstance } from 'fastify';

import { prisma } from '../../infra/db/prisma';
import { getActiveSessionById } from '../../infra/auth/sessionStore';

export type AuthUser = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

declare module 'fastify' {
  interface FastifyRequest {
    auth:
      | {
          user: AuthUser | null;
          sessionId: string | null;
        }
      | null;
  }
}

export async function registerAuthContext(app: FastifyInstance) {
  app.decorateRequest('auth', null);

  app.addHook('onRequest', async (request) => {
    const sid = request.cookies.sid;

    request.auth = {
      user: null,
      sessionId: typeof sid === 'string' ? sid : null,
    };

    if (typeof sid !== 'string' || sid.length < 10) return;

    const session = await getActiveSessionById(sid);
    if (!session) return;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    if (!user) return;

    request.auth = {
      user,
      sessionId: sid,
    };
  });
}
