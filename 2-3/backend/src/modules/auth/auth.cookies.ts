import type { FastifyReply } from 'fastify';

import { getEnv } from '../../shared/config/env';
import { getSessionCookieSettings } from '../../shared/auth/session.cookie';

export function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  const env = getEnv();
  const { name, options } = getSessionCookieSettings(env);
  (reply as any).setCookie(name, sessionId, options);
}

export function clearSessionCookie(reply: FastifyReply): void {
  const env = getEnv();
  const { name, options } = getSessionCookieSettings(env);
  (reply as any).setCookie(name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0)
  });
}
