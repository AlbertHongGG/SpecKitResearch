import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@prisma/client';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

async function registerAndLogin(app: NestFastifyApplication, email: string, password: string): Promise<string> {
  await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
  const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
  const cookieHeader = buildCookieHeader(getSetCookieHeader(loginRes.headers));
  expect(cookieHeader).toContain('ap_session=');
  return cookieHeader;
}

describe('US3 Admin catalog', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaClient;
  let cleanupDb: (() => void) | undefined;

  beforeAll(async () => {
    const db = setupTestDb();
    cleanupDb = db.cleanup;
    prisma = new PrismaClient();
    app = await createTestApp();

    // Ensure rate-limit policy exists for code paths that may read it.
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

  it('admin can create catalog and removing a rule enforces 403', async () => {
    const adminEmail = 'admin@example.com';
    const password = 'password123';
    await injectJson(app, { method: 'POST', url: '/register', body: { email: adminEmail, password } });
    await prisma.user.update({ where: { email: adminEmail.toLowerCase() }, data: { role: 'admin' } });
    const adminLoginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email: adminEmail, password } });
    const adminCookie = buildCookieHeader(getSetCookieHeader(adminLoginRes.headers));

    const serviceRes = await injectJson(app, {
      method: 'POST',
      url: '/admin/services',
      headers: { cookie: adminCookie },
      body: { name: 'demo', description: 'Demo', status: 'active' }
    });
    expect(serviceRes.statusCode).toBe(201);
    const serviceId = serviceRes.json?.id;
    expect(serviceId).toBeTruthy();

    const endpointRes = await injectJson(app, {
      method: 'POST',
      url: `/admin/services/${serviceId}/endpoints`,
      headers: { cookie: adminCookie },
      body: { method: 'GET', path: '/demo/ping', description: 'Ping', status: 'active' }
    });
    expect(endpointRes.statusCode).toBe(201);
    const endpointId = endpointRes.json?.id;
    expect(endpointId).toBeTruthy();

    const scopeRes = await injectJson(app, {
      method: 'POST',
      url: '/admin/scopes',
      headers: { cookie: adminCookie },
      body: { name: 'demo:read', description: 'Demo read' }
    });
    expect(scopeRes.statusCode).toBe(201);
    const scopeId = scopeRes.json?.id;
    expect(scopeId).toBeTruthy();

    const ruleRes = await injectJson(app, {
      method: 'POST',
      url: '/admin/scope-rules',
      headers: { cookie: adminCookie },
      body: { scope_id: scopeId, endpoint_id: endpointId }
    });
    expect(ruleRes.statusCode).toBe(201);
    const scopeRuleId = ruleRes.json?.id;
    expect(scopeRuleId).toBeTruthy();

    const devCookie = await registerAndLogin(app, 'dev@example.com', password);
    const keyRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: devCookie },
      body: { name: 'k1', scopes: ['demo:read'] }
    });
    expect(keyRes.statusCode).toBe(201);
    const plaintext = keyRes.json?.api_key_plaintext;
    expect(String(plaintext)).toMatch(/^ak_/);

    const okRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${plaintext}` }
    });
    expect(okRes.statusCode).toBe(200);
    expect(okRes.json?.ok).toBe(true);

    const delRes = await injectJson(app, {
      method: 'DELETE',
      url: `/admin/scope-rules/${scopeRuleId}`,
      headers: { cookie: adminCookie }
    });
    expect(delRes.statusCode).toBe(204);

    const forbiddenRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${plaintext}` }
    });
    expect(forbiddenRes.statusCode).toBe(403);
  });
});
