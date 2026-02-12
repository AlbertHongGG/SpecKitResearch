import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { ApiError } from '../observability/errors.js';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';

function ensureCsrfCookie(reply: FastifyReply, request: FastifyRequest) {
  const existing = request.cookies?.[CSRF_COOKIE];
  if (existing) return;

  reply.setCookie(CSRF_COOKIE, randomUUID(), {
    httpOnly: false,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function shouldSkipCsrfCheck(request: FastifyRequest) {
  // Allow initial login without CSRF token; all other unsafe endpoints require it.
  if (request.method !== 'POST') return false;
  const path = request.url.split('?', 1)[0];
  return path === '/api/auth/login';
}

export function registerCsrf(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    ensureCsrfCookie(reply, request);
    if (!isUnsafeMethod(request.method)) return;
    if (shouldSkipCsrfCheck(request)) return;

    const cookie = request.cookies?.[CSRF_COOKIE];
    const header = request.headers[CSRF_HEADER] as string | undefined;
    if (!cookie || !header || cookie !== header) {
      throw new ApiError({ statusCode: 403, code: 'Forbidden', message: 'CSRF token missing/invalid' });
    }
  });
}

export function readCsrfTokenFromRequest(request: FastifyRequest) {
  return request.cookies?.[CSRF_COOKIE] ?? null;
}
