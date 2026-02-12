// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('POST /api/transactions', () => {
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
    expect(res.status).toBe(201);

    const token = extractCookieValue(res.headers.get('set-cookie'), process.env.AUTH_COOKIE_NAME!);
    expect(token).toBeTruthy();
    return makeCookieHeader(process.env.AUTH_COOKIE_NAME!, token!);
  }

  async function getFirstCategoryId(cookie: string): Promise<string> {
    const { GET } = await import('@/app/api/categories/route');
    const req = makeNextRequest({
      method: 'GET',
      url: `${env.baseUrl}/api/categories`,
      autoSameOriginHeaders: false,
      cookie,
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.categories.length).toBeGreaterThan(0);
    return json.categories[0].id;
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { POST } = await import('@/app/api/transactions/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: { type: 'expense', amount: 100, categoryId: 'x', date: '2026-02-01' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'UNAUTHENTICATED', message: '請先登入' } });
  });

  it('201: creates transaction for signed-in user', async () => {
    const cookie = await registerAndGetCookie('tx@example.com');
    const categoryId = await getFirstCategoryId(cookie);

    const { POST } = await import('@/app/api/transactions/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: { type: 'expense', amount: 123, categoryId, date: '2026-02-01', note: 'lunch' },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json).toHaveProperty('transaction.id');
    expect(json).toHaveProperty('transaction.type', 'expense');
    expect(json).toHaveProperty('transaction.amount', 123);
    expect(json).toHaveProperty('transaction.categoryId', categoryId);
    expect(json).toHaveProperty('transaction.date', '2026-02-01');
    expect(json).toHaveProperty('transaction.note', 'lunch');
  });

  it('403: cannot create using another user\'s category', async () => {
    const cookie1 = await registerAndGetCookie('u1@example.com');
    const cookie2 = await registerAndGetCookie('u2@example.com');

    const otherUsersCategoryId = await getFirstCategoryId(cookie2);

    const { POST } = await import('@/app/api/transactions/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: { type: 'expense', amount: 50, categoryId: otherUsersCategoryId, date: '2026-02-01' },
      cookie: cookie1,
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'FORBIDDEN', message: '無權限' } });
  });

  it('404: unknown category returns CATEGORY_NOT_FOUND', async () => {
    const cookie = await registerAndGetCookie('tx404@example.com');

    const { POST } = await import('@/app/api/transactions/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: { type: 'expense', amount: 100, categoryId: 'nonexistent', date: '2026-02-01' },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'CATEGORY_NOT_FOUND', message: '類別不存在' } });
  });

  it('422: invalid payload returns VALIDATION', async () => {
    const cookie = await registerAndGetCookie('tx422@example.com');

    const { POST } = await import('@/app/api/transactions/route');

    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: { type: 'expense', amount: -1, categoryId: '', date: '2026/02/01' },
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
