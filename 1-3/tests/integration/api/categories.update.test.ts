// @vitest-environment node
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { setupApiTestEnv, migrateTestDb, wipeDb, disconnectDb } from '@/../tests/helpers/apiTestEnv';
import { makeNextRequest, extractCookieValue, makeCookieHeader } from '@/../tests/helpers/nextRequest';

describe('PATCH /api/categories/:categoryId', () => {
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

  async function createCategory(cookie: string, name: string) {
    const { POST } = await import('@/app/api/categories/route');
    const req = makeNextRequest({ method: 'POST', url: `${env.baseUrl}/api/categories`, json: { name, type: 'expense' }, cookie, host: env.host, proto: env.proto });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    return json.category.id as string;
  }

  it('401: without session returns UNAUTHENTICATED', async () => {
    const { PATCH } = await import('@/app/api/categories/[categoryId]/route');
    const req = makeNextRequest({ method: 'PATCH', url: `${env.baseUrl}/api/categories/x`, json: { name: 'Y' }, host: env.host, proto: env.proto });
    const res = await PATCH(req, { params: { categoryId: 'x' } });
    expect(res.status).toBe(401);
  });

  it('200: updates category for owner', async () => {
    const cookie = await registerAndGetCookie('cupd@example.com');
    const id = await createCategory(cookie, 'ToRename');

    const { PATCH } = await import('@/app/api/categories/[categoryId]/route');
    const req = makeNextRequest({ method: 'PATCH', url: `${env.baseUrl}/api/categories/${id}`, json: { name: 'Renamed', isActive: false }, cookie, host: env.host, proto: env.proto });

    const res = await PATCH(req, { params: { categoryId: id } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.category).toMatchObject({ id, name: 'Renamed', isActive: false });
  });

  it('403: cannot update another user\'s category', async () => {
    const cookie1 = await registerAndGetCookie('u1@example.com');
    const cookie2 = await registerAndGetCookie('u2@example.com');

    const otherId = await createCategory(cookie2, 'Other');

    const { PATCH } = await import('@/app/api/categories/[categoryId]/route');
    const req = makeNextRequest({ method: 'PATCH', url: `${env.baseUrl}/api/categories/${otherId}`, json: { name: 'X' }, cookie: cookie1, host: env.host, proto: env.proto });

    const res = await PATCH(req, { params: { categoryId: otherId } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'FORBIDDEN', message: '無權限' } });
  });

  it('404: missing category returns CATEGORY_NOT_FOUND', async () => {
    const cookie = await registerAndGetCookie('c404@example.com');

    const { PATCH } = await import('@/app/api/categories/[categoryId]/route');
    const req = makeNextRequest({ method: 'PATCH', url: `${env.baseUrl}/api/categories/missing`, json: { name: 'X' }, cookie, host: env.host, proto: env.proto });

    const res = await PATCH(req, { params: { categoryId: 'missing' } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'CATEGORY_NOT_FOUND', message: '類別不存在' } });
  });

  it('409: renaming to existing name returns CATEGORY_NAME_TAKEN', async () => {
    const cookie = await registerAndGetCookie('c409@example.com');
    const a = await createCategory(cookie, 'A');
    const b = await createCategory(cookie, 'B');

    const { PATCH } = await import('@/app/api/categories/[categoryId]/route');
    const req = makeNextRequest({ method: 'PATCH', url: `${env.baseUrl}/api/categories/${b}`, json: { name: 'A' }, cookie, host: env.host, proto: env.proto });

    const res = await PATCH(req, { params: { categoryId: b } });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ error: { code: 'CATEGORY_NAME_TAKEN', message: '類別名稱已存在' } });
  });
});
