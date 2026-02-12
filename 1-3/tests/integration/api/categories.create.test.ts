// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('POST /api/categories', () => {
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

  async function registerAndGetCookie(email: string): Promise<string> {
    const { POST } = await import('@/app/api/auth/register/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email, password: 'Password123', passwordConfirm: 'Password123' },
      host: env.host,
      proto: env.proto,
    });
    const res = await POST(req);
    const token = extractCookieValue(res.headers.get('set-cookie'), process.env.AUTH_COOKIE_NAME!);
    return makeCookieHeader(process.env.AUTH_COOKIE_NAME!, token!);
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { POST } = await import('@/app/api/categories/route');
    const req = makeNextRequest({ method: 'POST', url: `${env.baseUrl}/api/categories`, json: { name: 'X', type: 'expense' }, host: env.host, proto: env.proto });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('201: creates category for signed-in user', async () => {
    const cookie = await registerAndGetCookie('ccreate@example.com');

    const { POST } = await import('@/app/api/categories/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/categories`,
      json: { name: 'MyCat', type: 'expense' },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.category).toMatchObject({ name: 'MyCat', type: 'expense', isActive: true });
  });

  it('409: duplicate name returns CATEGORY_NAME_TAKEN', async () => {
    const cookie = await registerAndGetCookie('cdup@example.com');

    const { POST } = await import('@/app/api/categories/route');

    const req1 = makeNextRequest({ method: 'POST', url: `${env.baseUrl}/api/categories`, json: { name: 'Dup', type: 'expense' }, cookie, host: env.host, proto: env.proto });
    const res1 = await POST(req1);
    expect(res1.status).toBe(201);

    const req2 = makeNextRequest({ method: 'POST', url: `${env.baseUrl}/api/categories`, json: { name: 'Dup', type: 'expense' }, cookie, host: env.host, proto: env.proto });
    const res2 = await POST(req2);
    expect(res2.status).toBe(409);

    const json = await res2.json();
    expect(json).toEqual({ error: { code: 'CATEGORY_NAME_TAKEN', message: '類別名稱已存在' } });
  });

  it('422: invalid payload returns VALIDATION', async () => {
    const cookie = await registerAndGetCookie('c422@example.com');

    const { POST } = await import('@/app/api/categories/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/categories`,
      json: { name: 'x'.repeat(50), type: 'expense' },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'VALIDATION', message: '輸入驗證失敗' } });
  });
});
