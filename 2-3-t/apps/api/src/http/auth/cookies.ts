import type { FastifyReply } from 'fastify';
import type { AppConfig } from '../../config';

export const ACCESS_COOKIE = 'tl_access';
export const REFRESH_COOKIE = 'tl_refresh';

function baseCookieOpts(config: AppConfig) {
  const isProd = config.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setAuthCookies(
  reply: FastifyReply,
  config: AppConfig,
  tokens: { accessToken: string; refreshToken: string; accessMaxAgeSec: number; refreshMaxAgeSec: number }
) {
  const base = baseCookieOpts(config);
  reply
    .setCookie(ACCESS_COOKIE, tokens.accessToken, {
      ...base,
      signed: true,
      maxAge: tokens.accessMaxAgeSec,
    })
    .setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...base,
      signed: true,
      maxAge: tokens.refreshMaxAgeSec,
    });
}

export function clearAuthCookies(reply: FastifyReply, config: AppConfig) {
  const base = baseCookieOpts(config);
  reply
    .clearCookie(ACCESS_COOKIE, base)
    .clearCookie(REFRESH_COOKIE, base);
}
