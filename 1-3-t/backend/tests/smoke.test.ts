import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app';

describe('backend smoke', () => {
  const originalEnv = process.env;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      DATABASE_URL: originalEnv.DATABASE_URL ?? 'postgresql://app:app@localhost:5432/app',
      SESSION_SECRET: originalEnv.SESSION_SECRET ?? 'dev-secret-change-me-please',
      APP_ORIGIN: originalEnv.APP_ORIGIN ?? 'http://localhost:5173',
    };

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    process.env = originalEnv;
  });

  it('GET /health returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
