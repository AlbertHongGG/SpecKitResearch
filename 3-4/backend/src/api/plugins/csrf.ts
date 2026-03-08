import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import type { AppConfig } from '../../lib/config.js';
import { forbidden } from '../errors.js';
import fp from 'fastify-plugin';

function isStateChanging(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

const impl: FastifyPluginAsync<{ config: AppConfig }> = async (app, opts) => {
  const cookieName = opts.config.CSRF_COOKIE_NAME;
  const allowedOrigins = opts.config.CORS_ORIGINS.split(',').map((s) => s.trim());

  app.addHook('onRequest', async (request, reply) => {
    // Ensure CSRF cookie exists for browser clients.
    const existing = request.cookies?.[cookieName];
    if (!existing) {
      const token = crypto.randomBytes(16).toString('hex');
      reply.setCookie(cookieName, token, {
        httpOnly: false,
        sameSite: 'lax',
        secure: opts.config.COOKIE_SECURE,
        path: '/',
      });
    }

    if (!isStateChanging(request.method)) return;

    // Login intentionally does NOT require CSRF.
    if (request.url.startsWith('/api/auth/login')) return;

    // Best-effort endpoints.
    if (request.url.includes('/api/returns/') && request.url.endsWith('/ack')) return;

    const origin = request.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) {
      if (!allowedOrigins.includes(origin)) {
        throw forbidden('CSRF blocked: origin not allowed');
      }
    }

    const cookieToken = request.cookies?.[cookieName];
    const headerToken = request.headers['x-csrf-token'];

    if (!cookieToken || typeof headerToken !== 'string' || headerToken !== cookieToken) {
      throw forbidden('CSRF token invalid');
    }
  });
};

export const csrfPlugin = fp(impl);
