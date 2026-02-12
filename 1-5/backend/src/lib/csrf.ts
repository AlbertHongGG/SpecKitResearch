import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';
import { config, isProd } from './config.js';
import { forbidden } from './httpError.js';

export function issueCsrfToken(reply: FastifyReply): string {
  const token = randomUUID();

  // CSRF token cookie MUST be readable by JS so SPA can echo it in a header.
  reply.setCookie(config.CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: config.COOKIE_SECURE || isProd,
    sameSite: 'lax',
    path: '/',
  });

  return token;
}

export function requireCsrf(request: FastifyRequest): void {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const cookieToken = (request.cookies as Record<string, unknown>)[config.CSRF_COOKIE_NAME];
  const headerToken = request.headers[config.CSRF_HEADER_NAME] ?? request.headers[config.CSRF_HEADER_NAME.toLowerCase()];

  if (typeof cookieToken !== 'string' || cookieToken.length === 0) {
    throw forbidden('CSRF token missing');
  }

  if (typeof headerToken !== 'string' || headerToken.length === 0) {
    throw forbidden('CSRF header missing');
  }

  if (cookieToken !== headerToken) {
    throw forbidden('CSRF token mismatch');
  }

  // Basic Origin/Referer enforcement for browsers
  const origin = request.headers.origin;
  if (typeof origin === 'string' && origin.length > 0 && origin !== config.CORS_ORIGIN) {
    throw forbidden('Origin not allowed');
  }
}
