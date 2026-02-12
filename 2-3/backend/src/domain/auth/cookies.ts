import type { FastifyReply } from 'fastify';
import { env } from '../../config/env.js';

export const ACCESS_COOKIE = 'tl_access';
export const REFRESH_COOKIE = 'tl_refresh';

export function setAccessCookie(reply: FastifyReply, token: string, expiresAt: Date) {
    reply.setCookie(ACCESS_COOKIE, token, {
        path: '/',
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAMESITE,
        domain: env.COOKIE_DOMAIN || undefined,
        expires: expiresAt,
    });
}

export function setRefreshCookie(reply: FastifyReply, token: string, expiresAt: Date) {
    reply.setCookie(REFRESH_COOKIE, token, {
        path: '/auth/refresh',
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAMESITE,
        domain: env.COOKIE_DOMAIN || undefined,
        expires: expiresAt,
    });
}

export function clearAuthCookies(reply: FastifyReply) {
    reply.clearCookie(ACCESS_COOKIE, { path: '/' });
    reply.clearCookie(REFRESH_COOKIE, { path: '/auth/refresh' });
}
