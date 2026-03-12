import type { CookieSerializeOptions } from '@fastify/cookie';

import type { Env } from '../config/env';

export type SessionCookieSettings = {
  name: string;
  options: CookieSerializeOptions;
};

export function getSessionCookieSettings(env: Env): SessionCookieSettings {
  const maxAgeSeconds = env.SESSION_TTL_DAYS * 24 * 60 * 60;

  return {
    name: env.SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: env.SESSION_COOKIE_SECURE,
      sameSite: env.SESSION_COOKIE_SAMESITE,
      path: '/',
      maxAge: maxAgeSeconds
    }
  };
}
