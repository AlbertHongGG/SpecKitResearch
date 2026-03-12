import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@prisma/client';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

async function login(app: NestFastifyApplication, email: string, password: string): Promise<string> {
  const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
  return buildCookieHeader(getSetCookieHeader(loginRes.headers));
}

describe('US3 Admin enforcement', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaClient;
  let cleanupDb: (() => void) | undefined;

  beforeAll(async () => {
    const db = setupTestDb();
    cleanupDb = db.cleanup;
    prisma = new PrismaClient();
    app = await createTestApp();

    await prisma.rateLimitPolicy.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', defaultPerMinute: 60, defaultPerHour: 1000, capPerMinute: 600, capPerHour: 10_000 }
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    cleanupDb?.();
  });

  it('admin can block key and disable user (session + keys invalidated)', async () => {
    const password = 'password123';

    // Admin user
    const adminEmail = 'admin@example.com';
    await injectJson(app, { method: 'POST', url: '/register', body: { email: adminEmail, password } });
    await prisma.user.update({ where: { email: adminEmail.toLowerCase() }, data: { role: 'admin' } });
    const adminCookie = await login(app, adminEmail, password);

    // Catalog
    const serviceRes = await injectJson(app, {
      method: 'POST',
      url: '/admin/services',
      headers: { cookie: adminCookie },
      body: { name: 'demo', description: 'Demo', status: 'active' }
    });
    const serviceId = serviceRes.json?.id;
    const endpointRes = await injectJson(app, {
      method: 'POST',
      url: `/admin/services/${serviceId}/endpoints`,
      headers: { cookie: adminCookie },
      body: { method: 'GET', path: '/demo/ping', status: 'active' }
    });
    const endpointId = endpointRes.json?.id;
    const scopeRes = await injectJson(app, {
      method: 'POST',
      url: '/admin/scopes',
      headers: { cookie: adminCookie },
      body: { name: 'demo:read', description: 'Demo read' }
    });
    const scopeId = scopeRes.json?.id;
    await injectJson(app, {
      method: 'POST',
      url: '/admin/scope-rules',
      headers: { cookie: adminCookie },
      body: { scope_id: scopeId, endpoint_id: endpointId }
    });

    // Developer
    const devEmail = 'dev@example.com';
    await injectJson(app, { method: 'POST', url: '/register', body: { email: devEmail, password } });
    const devCookie = await login(app, devEmail, password);

    const meRes = await injectJson(app, { method: 'GET', url: '/me', headers: { cookie: devCookie } });
    expect(meRes.statusCode).toBe(200);
    const devUserId = meRes.json?.user_id;
    expect(devUserId).toBeTruthy();

    const key1Res = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: devCookie },
      body: { name: 'k1', scopes: ['demo:read'] }
    });
    expect(key1Res.statusCode).toBe(201);
    const key1Id = key1Res.json?.api_key_id;
    const key1Plain = key1Res.json?.api_key_plaintext;

    const okRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${key1Plain}` }
    });
    expect(okRes.statusCode).toBe(200);

    // Block key
    const blockRes = await injectJson(app, {
      method: 'POST',
      url: `/api-keys/${key1Id}/block`,
      headers: { cookie: adminCookie }
    });
    expect(blockRes.statusCode).toBe(204);

    const unauthorizedRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${key1Plain}` }
    });
    expect(unauthorizedRes.statusCode).toBe(401);

    // Create a second key (still works before disable)
    const key2Res = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: devCookie },
      body: { name: 'k2', scopes: ['demo:read'] }
    });
    const key2Plain = key2Res.json?.api_key_plaintext;
    const ok2Res = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${key2Plain}` }
    });
    expect(ok2Res.statusCode).toBe(200);

    // Disable user
    const disableRes = await injectJson(app, {
      method: 'POST',
      url: `/admin/users/${devUserId}/disable`,
      headers: { cookie: adminCookie }
    });
    expect(disableRes.statusCode).toBe(204);

    const meAfterRes = await injectJson(app, { method: 'GET', url: '/me', headers: { cookie: devCookie } });
    expect(meAfterRes.statusCode).toBe(401);

    const key2AfterRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${key2Plain}` }
    });
    expect(key2AfterRes.statusCode).toBe(401);
  });
});
