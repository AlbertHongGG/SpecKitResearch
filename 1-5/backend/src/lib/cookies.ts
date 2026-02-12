import type { FastifyReply } from 'fastify';
import { config, isProd } from './config.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE || isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setAuthCookies(reply: FastifyReply, tokens: { accessToken: string; refreshToken: string }) {
  reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    maxAge: 60 * 15,
  });

  reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie(ACCESS_COOKIE, { path: '/' });
  reply.clearCookie(REFRESH_COOKIE, { path: '/' });
}
