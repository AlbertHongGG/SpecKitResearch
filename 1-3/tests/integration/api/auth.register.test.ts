// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue } from '@/../tests/helpers/nextRequest';

describe('POST /api/auth/register', () => {
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

  it('201: registers user and sets session cookie', async () => {
    const { POST } = await import('@/app/api/auth/register/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email: 'a@example.com', password: 'Password123', passwordConfirm: 'Password123' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json).toHaveProperty('user.id');
    expect(json).toHaveProperty('user.email', 'a@example.com');

    const token = extractCookieValue(res.headers.get('set-cookie'), process.env.AUTH_COOKIE_NAME!);
    expect(token).toBeTruthy();
  });

  it('409: duplicate email returns EMAIL_TAKEN', async () => {
    const { POST } = await import('@/app/api/auth/register/route');

    const req1 = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email: 'dup@example.com', password: 'Password123', passwordConfirm: 'Password123' },
      host: env.host,
      proto: env.proto,
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(201);

    const req2 = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email: 'dup@example.com', password: 'Password123', passwordConfirm: 'Password123' },
      host: env.host,
      proto: env.proto,
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(409);

    const json = await res2.json();
    expect(json).toEqual({ error: { code: 'EMAIL_TAKEN', message: 'Email 已被註冊' } });
  });

  it('422: invalid payload returns VALIDATION', async () => {
    const { POST } = await import('@/app/api/auth/register/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email: 'not-an-email', password: 'short' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'VALIDATION', message: '輸入驗證失敗' } });
  });
});
