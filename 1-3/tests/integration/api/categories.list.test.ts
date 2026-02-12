// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('GET /api/categories', () => {
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

  async function registerAndGetCookie(): Promise<string> {
    const { POST } = await import('@/app/api/auth/register/route');
    const req = makeNextRequest({
      method: 'POST',
      url: `${env.baseUrl}/api/auth/register`,
      json: { email: 'cat@example.com', password: 'Password123', passwordConfirm: 'Password123' },
      host: env.host,
      proto: env.proto,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const token = extractCookieValue(res.headers.get('set-cookie'), process.env.AUTH_COOKIE_NAME!);
    expect(token).toBeTruthy();
    return makeCookieHeader(process.env.AUTH_COOKIE_NAME!, token!);
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { GET } = await import('@/app/api/categories/route');

    const req = makeNextRequest({
      method: 'GET',
      url: `${env.baseUrl}/api/categories`,
      autoSameOriginHeaders: false,
    });

    const res = await GET(req);
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json).toEqual({ error: { code: 'UNAUTHENTICATED', message: '請先登入' } });
  });

  it('200: returns categories for signed-in user', async () => {
    const cookie = await registerAndGetCookie();

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
    expect(Array.isArray(json.categories)).toBe(true);
    expect(json.categories.length).toBeGreaterThan(0);
  });
});
