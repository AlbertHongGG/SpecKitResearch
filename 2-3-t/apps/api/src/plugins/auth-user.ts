import type { FastifyPluginAsync } from 'fastify';
import { ACCESS_COOKIE } from '../http/auth/cookies';
import { decodeAccessPayload, getSignedCookie, isAccessExpired } from '../http/auth/access';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      displayName: string;
    };
  }
}

export const authUserPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (req) => {
    const raw = getSignedCookie(req, ACCESS_COOKIE);
    if (!raw) return;

    try {
      const payload = decodeAccessPayload(raw);
      if (isAccessExpired(payload)) return;
      req.user = {
        id: payload.userId,
        email: payload.email,
        displayName: payload.displayName,
      };
    } catch {
      // ignore invalid cookie
    }
  });
};
