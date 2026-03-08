import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { errorHandlerPlugin } from '../../src/api/plugins/errorHandler';
import { cookiesPlugin } from '../../src/api/plugins/cookies';
import { csrfPlugin } from '../../src/api/plugins/csrf';

const config = {
  DATABASE_URL: 'file:./dev.db',
  PORT: 3000,
  APP_BASE_URL: 'http://localhost:3000',
  FRONTEND_BASE_URL: 'http://localhost:5173',
  SESSION_COOKIE_NAME: 'paysim_session',
  CSRF_COOKIE_NAME: 'csrf_token',
  SESSION_IDLE_SEC: 28800,
  SESSION_ABSOLUTE_SEC: 604800,
  COOKIE_SECURE: false,
  CORS_ORIGINS: 'http://localhost:5173',
  WEBHOOK_SIGNING_TOLERANCE_SEC: 300,
  WEBHOOK_MAX_ATTEMPTS: 10,
  WEBHOOK_TIMEOUT_MS: 5000,
  WEBHOOK_WORKER_ID: 'worker-1',
  SECRET_ENCRYPTION_KEY_BASE64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  RUN_WEBHOOK_WORKER: true,
} as const;

describe('csrfPlugin', () => {
  async function buildApp() {
    const app = Fastify({ logger: false });

    await app.register(async (scoped) => {
      await scoped.register(errorHandlerPlugin);
      await scoped.register(cookiesPlugin, { config });
      await scoped.register(csrfPlugin, { config });

      scoped.get('/api/ping', async () => ({ ok: true }));
      scoped.post('/api/echo', async () => ({ ok: true }));
      scoped.post('/api/auth/login', async () => ({ ok: true }));
      scoped.post('/api/returns/ret_123/ack', async () => ({ ok: true }));
    });

    await app.ready();
    return app;
  }

  it('blocks state-changing requests without matching header token', async () => {
    const app = await buildApp();

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/echo',
    });

    expect(res2.statusCode).toBe(403);
    const body = res2.json();
    expect(body?.error?.code).toBe('FORBIDDEN');

    await app.close();
  });

  it('allows state-changing request when cookie and header match', async () => {
    const app = await buildApp();
    const token = 'unit_test_token';

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/echo',
      headers: {
        cookie: `csrf_token=${token}`,
        origin: 'http://localhost:5173',
        'x-csrf-token': token!,
      },
    });

    expect(res2.statusCode).toBe(200);

    await app.close();
  });

  it('does not require CSRF for /api/auth/login', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/auth/login' });
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('does not require CSRF for /api/returns/*/ack', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/returns/ret_123/ack' });
    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it('blocks state-changing requests with disallowed Origin', async () => {
    const app = await buildApp();
    const token = 'unit_test_token';

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/echo',
      headers: {
        cookie: `csrf_token=${token}`,
        origin: 'http://evil.example.com',
        'x-csrf-token': token!,
      },
    });

    expect(res2.statusCode).toBe(403);

    await app.close();
  });
});
