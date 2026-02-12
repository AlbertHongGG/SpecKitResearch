// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('PATCH /api/transactions/:transactionId', () => {
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
    return makeCookieHeader(process.env.AUTH_COOKIE_NAME!, token!);
  }

  async function getFirstCategoryId(cookie: string): Promise<string> {
    const { GET } = await import('@/app/api/categories/route');
    const req = makeNextRequest({ method: 'GET', url: `${env.baseUrl}/api/categories`, autoSameOriginHeaders: false, cookie });
    const res = await GET(req);
    const json = await res.json();
    return json.categories[0].id;
  }

  async function createTx(cookie: string, categoryId: string) {
    const { POST } = await import('@/app/api/transactions/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: { type: 'expense', amount: 100, categoryId, date: '2026-02-01', note: 'n' },
      cookie,
      host: env.host,
      proto: env.proto,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    return json.transaction.id as string;
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { PATCH } = await import('@/app/api/transactions/[transactionId]/route');

    const req = makeNextRequest({
      method: 'PATCH',
      url: `${env.baseUrl}/api/transactions/x`,
      json: { amount: 200 },
      host: env.host,
      proto: env.proto,
    });

    const res = await PATCH(req, { params: { transactionId: 'x' } });
    expect(res.status).toBe(401);
  });

  it('200: updates transaction fields', async () => {
    const cookie = await registerAndGetCookie('tup@example.com');
    const categoryId = await getFirstCategoryId(cookie);
    const txId = await createTx(cookie, categoryId);

    const { PATCH } = await import('@/app/api/transactions/[transactionId]/route');
    const req = makeNextRequest({
      method: 'PATCH',
      url: `${env.baseUrl}/api/transactions/${txId}`,
      json: { amount: 250, note: 'updated', date: '2026-02-02' },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await PATCH(req, { params: { transactionId: txId } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.transaction).toMatchObject({ id: txId, amount: 250, note: 'updated', date: '2026-02-02' });
  });

  it('403: cannot update another user\'s transaction', async () => {
    const cookie1 = await registerAndGetCookie('u1@example.com');
    const cookie2 = await registerAndGetCookie('u2@example.com');

    const category2 = await getFirstCategoryId(cookie2);
    const tx2 = await createTx(cookie2, category2);

    const { PATCH } = await import('@/app/api/transactions/[transactionId]/route');
    const req = makeNextRequest({
      method: 'PATCH',
      url: `${env.baseUrl}/api/transactions/${tx2}`,
      json: { amount: 1 },
      cookie: cookie1,
      host: env.host,
      proto: env.proto,
    });

    const res = await PATCH(req, { params: { transactionId: tx2 } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'FORBIDDEN', message: '無權限' } });
  });

  it('404: missing transaction returns TX_NOT_FOUND', async () => {
    const cookie = await registerAndGetCookie('t404@example.com');

    const { PATCH } = await import('@/app/api/transactions/[transactionId]/route');
    const req = makeNextRequest({
      method: 'PATCH',
      url: `${env.baseUrl}/api/transactions/missing`,
      json: { amount: 1 },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await PATCH(req, { params: { transactionId: 'missing' } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'TX_NOT_FOUND', message: '交易不存在' } });
  });

  it('422: invalid payload returns VALIDATION', async () => {
    const cookie = await registerAndGetCookie('t422@example.com');
    const categoryId = await getFirstCategoryId(cookie);
    const txId = await createTx(cookie, categoryId);

    const { PATCH } = await import('@/app/api/transactions/[transactionId]/route');
    const req = makeNextRequest({
      method: 'PATCH',
      url: `${env.baseUrl}/api/transactions/${txId}`,
      json: { amount: -1 },
      cookie,
      host: env.host,
      proto: env.proto,
    });

    const res = await PATCH(req, { params: { transactionId: txId } });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'VALIDATION', message: '輸入驗證失敗' } });
  });
});
