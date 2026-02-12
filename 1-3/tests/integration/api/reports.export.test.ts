// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('GET /api/reports/monthly/export', () => {
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

  async function getFirstCategory(cookie: string): Promise<{ id: string; name: string }> {
    const { GET } = await import('@/app/api/categories/route');
    const req = makeNextRequest({ method: 'GET', url: `${env.baseUrl}/api/categories`, autoSameOriginHeaders: false, cookie });
    const res = await GET(req);
    const json = await res.json();
    return { id: json.categories[0].id, name: json.categories[0].name };
  }

  async function createTx(cookie: string, payload: any) {
    const { POST } = await import('@/app/api/transactions/route');
    const req = makeNextRequest({ method: 'POST', url: `${env.baseUrl}/api/transactions`, json: payload, cookie, host: env.host, proto: env.proto });
    const res = await POST(req);
    expect(res.status).toBe(201);
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { GET } = await import('@/app/api/reports/monthly/export/route');
    const req = makeNextRequest({ method: 'GET', url: `${env.baseUrl}/api/reports/monthly/export?year=2026&month=2`, autoSameOriginHeaders: false });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('422: invalid month returns VALIDATION', async () => {
    const cookie = await registerAndGetCookie('e422@example.com');

    const { GET } = await import('@/app/api/reports/monthly/export/route');
    const req = makeNextRequest({ method: 'GET', url: `${env.baseUrl}/api/reports/monthly/export?year=2026&month=99`, autoSameOriginHeaders: false, cookie });

    const res = await GET(req);
    expect(res.status).toBe(422);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'VALIDATION', message: '年月不合法' } });
  });

  it('200: returns CSV with correct filename and rows', async () => {
    const cookie = await registerAndGetCookie('e200@example.com');
    const cat = await getFirstCategory(cookie);

    await createTx(cookie, { type: 'expense', amount: 123, categoryId: cat.id, date: '2026-02-01', note: 'lunch' });

    const { GET } = await import('@/app/api/reports/monthly/export/route');
    const req = makeNextRequest({ method: 'GET', url: `${env.baseUrl}/api/reports/monthly/export?year=2026&month=2`, autoSameOriginHeaders: false, cookie });

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('transactions_2026_02.csv');
    expect(res.headers.get('cache-control')).toContain('no-store');

    const text = await res.text();
    expect(text.startsWith('date,type,category,amount,note\n')).toBe(true);
    expect(text).toContain(`2026-02-01,expense,${cat.name},123,lunch\n`);
  });
});
