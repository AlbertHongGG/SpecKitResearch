import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { SessionService } from '../domain/auth/session_service';

type SessionAuthPluginOptions = {
  cookieName: string;
  sessionTtlSec: number;
  nodeEnv: 'development' | 'test' | 'production';
};

const sessionAuthPluginInner: FastifyPluginAsync<SessionAuthPluginOptions> = async (app, opts) => {
  const sessionService = new SessionService({
    prisma: app.prisma,
    ttlSec: opts.sessionTtlSec,
  });

  app.decorate('sessionService', sessionService);

  app.addHook('preHandler', async (request) => {
    const raw = request.cookies[opts.cookieName];
    if (!raw) return;

    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid) return;

    const result = await sessionService.validateSession(unsigned.value);
    if (!result) return;
    request.authUser = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role as any,
    };
    request.sessionId = result.session.sid;
  });
};

export const sessionAuthPlugin = fp(sessionAuthPluginInner, {
  name: 'sessionAuthPlugin',
});

declare module 'fastify' {
  interface FastifyInstance {
    sessionService: SessionService;
  }
  interface FastifyRequest {
    sessionId?: string;
  }
}
