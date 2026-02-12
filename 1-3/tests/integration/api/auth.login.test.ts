// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue } from '@/../tests/helpers/nextRequest';

describe('POST /api/auth/login', () => {
  const env = setupApiTestEnv();

  beforeAll(async () => {
    migrateTestDb();
  });

  beforeEach(async () => {
    await wipeDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  async function register(email: string, password: string) {
    const { POST } = await import('@/app/api/auth/register/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email, password, passwordConfirm: password },
      host: env.host,
      proto: env.proto,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  }

  it('200: valid credentials returns signedIn and sets session cookie', async () => {
    await register('u@example.com', 'Password123');

    const { POST } = await import('@/app/api/auth/login/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/login`,
      json: { email: 'u@example.com', password: 'Password123' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json).toEqual({ signedIn: true });

    const token = extractCookieValue(res.headers.get('set-cookie'), process.env.AUTH_COOKIE_NAME!);
    expect(token).toBeTruthy();
  });

  it('401: wrong password returns INVALID_CREDENTIALS', async () => {
    await register('u2@example.com', 'Password123');

    const { POST } = await import('@/app/api/auth/login/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/login`,
      json: { email: 'u2@example.com', password: 'WrongPassword123' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: '帳密錯誤' } });
  });

  it('401: unknown email returns INVALID_CREDENTIALS', async () => {
    const { POST } = await import('@/app/api/auth/login/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/login`,
      json: { email: 'missing@example.com', password: 'Password123' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: '帳密錯誤' } });
  });
});
