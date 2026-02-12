import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { nanoid } from 'nanoid';

import type { Env } from '../../config/env';
import { AppError } from '../http/errors';

const CSRF_COOKIE_NAME = 'csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function isUnsafeMethod(method: string) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function readHeader(request: FastifyRequest, name: string) {
  const v = request.headers[name.toLowerCase()];
  return typeof v === 'string' ? v : undefined;
}

function ensureSameOrigin(request: FastifyRequest, env: Env) {
  const origin = readHeader(request, 'origin');
  const referer = readHeader(request, 'referer');

  // If present, Origin must match.
  if (origin && origin !== env.APP_ORIGIN) {
    throw new AppError({
      code: 'CSRF_INVALID',
      status: 403,
      message: 'CSRF 驗證失敗',
      details: { reason: 'origin_mismatch' },
    });
  }

  // If Origin is absent, allow Referer check as defense-in-depth.
  if (!origin && referer && !referer.startsWith(env.APP_ORIGIN)) {
    throw new AppError({
      code: 'CSRF_INVALID',
      status: 403,
      message: 'CSRF 驗證失敗',
      details: { reason: 'referer_mismatch' },
    });
  }
}

function setCsrfCookie(reply: FastifyReply, token: string, env: Env) {
  reply.setCookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function registerCsrf(app: FastifyInstance, env: Env) {
  app.addHook('onRequest', async (request, reply) => {
    const existingToken = request.cookies[CSRF_COOKIE_NAME];
    if (typeof existingToken !== 'string' || existingToken.length < 16) {
      const token = `csrf_${nanoid(24)}`;
      setCsrfCookie(reply, token, env);
    }

    if (!isUnsafeMethod(request.method)) return;

    // If a request is not authenticated (no session cookie), allow it to fall through
    // to auth checks first so protected endpoints return 401 instead of 403.
    // Exception: auth endpoints should still be CSRF-protected even before login.
    const path = request.url.split('?')[0] ?? request.url;
    const hasSessionCookie = typeof request.cookies.sid === 'string' && request.cookies.sid.length > 0;
    const isAuthEndpoint = path === '/auth/login' || path === '/auth/register';
    if (!hasSessionCookie && !isAuthEndpoint) return;

    ensureSameOrigin(request, env);

    const cookieToken = request.cookies[CSRF_COOKIE_NAME];
    const headerToken = readHeader(request, CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new AppError({
        code: 'CSRF_INVALID',
        status: 403,
        message: 'CSRF 驗證失敗',
      });
    }
  });
}
