// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('GET /api/transactions (with dailySummaries)', () => {
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
    const req = makeNextRequest({ method: 'GET', url: `${env.baseUrl}/api/categories`, autoSameOriginHeaders: false, cookie });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    return json.categories[0].id;
  }

  async function createTx(cookie: string, payload: any) {
    const { POST } = await import('@/app/api/transactions/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/transactions`,
      json: payload,
      cookie,
      host: env.host,
      proto: env.proto,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    return res;
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { GET } = await import('@/app/api/transactions/route');

    const req = makeNextRequest({
      method: 'GET',
      url: `${env.baseUrl}/api/transactions?page=1&pageSize=30`,
      autoSameOriginHeaders: false,
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'UNAUTHENTICATED', message: '請先登入' } });
  });

  it('200: returns items + dailySummaries for the returned page', async () => {
    const cookie = await registerAndGetCookie('tlist@example.com');
    const categoryId = await getFirstCategoryId(cookie);

    await createTx(cookie, { type: 'expense', amount: 100, categoryId, date: '2026-02-02' });
    await createTx(cookie, { type: 'income', amount: 250, categoryId, date: '2026-02-02' });
    await createTx(cookie, { type: 'expense', amount: 50, categoryId, date: '2026-02-01' });

    const { GET } = await import('@/app/api/transactions/route');
    const req = makeNextRequest({
      method: 'GET',
      url: `${env.baseUrl}/api/transactions?page=1&pageSize=50`,
      autoSameOriginHeaders: false,
      cookie,
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.items).toHaveLength(3);
    expect(json.pageInfo).toMatchObject({ page: 1, pageSize: 50, total: 3 });

    expect(json.dailySummaries).toEqual([
      { date: '2026-02-02', incomeTotal: 250, expenseTotal: 100 },
      { date: '2026-02-01', incomeTotal: 0, expenseTotal: 50 },
    ]);
  });
});
