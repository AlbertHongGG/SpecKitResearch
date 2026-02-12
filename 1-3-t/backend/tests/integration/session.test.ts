import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('GET /session', () => {
  let app: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://app:app@localhost:5432/app';
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me-please';
    process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173';

    const { buildApp } = await import('../../src/app');

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({ method: 'GET', url: '/session' });
    expect(res.statusCode).toBe(401);
    const json = res.json();
    expect(json).toMatchObject({
      code: 'AUTH_REQUIRED',
      message: expect.any(String),
      requestId: expect.any(String),
    });
  });
});
