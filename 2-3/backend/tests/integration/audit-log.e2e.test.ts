import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@prisma/client';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

async function register(app: NestFastifyApplication, email: string, password: string): Promise<void> {
  const res = await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
  expect([201, 409]).toContain(res.statusCode);
}

async function login(app: NestFastifyApplication, email: string, password: string): Promise<string> {
  const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
  return buildCookieHeader(getSetCookieHeader(loginRes.headers));
}

describe('US3 Audit log', () => {
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

  it('writes audit logs for sensitive actions and admin can query them', async () => {
    const password = 'password123';
    const adminEmail = 'admin@example.com';
    const devEmail = 'dev@example.com';

    await register(app, adminEmail, password);
    await prisma.user.update({ where: { email: adminEmail.toLowerCase() }, data: { role: 'admin' } });
    const adminCookie = await login(app, adminEmail, password);

    // Seed catalog via admin APIs
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

    await register(app, devEmail, password);
    const devCookie = await login(app, devEmail, password);

    const keyRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: devCookie },
      body: { name: 'k1', scopes: ['demo:read'] }
    });
    expect(keyRes.statusCode).toBe(201);
    const keyId = keyRes.json?.api_key_id;

    const updRes = await injectJson(app, {
      method: 'PATCH',
      url: `/api-keys/${keyId}`,
      headers: { cookie: devCookie },
      body: { name: 'k1-updated' }
    });
    expect(updRes.statusCode).toBe(200);

    const revokeRes = await injectJson(app, {
      method: 'POST',
      url: `/api-keys/${keyId}/revoke`,
      headers: { cookie: devCookie }
    });
    expect(revokeRes.statusCode).toBe(204);

    const from = new Date(Date.now() - 5 * 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();

    const auditRes = await injectJson(app, {
      method: 'GET',
      url: `/audit-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      headers: { cookie: adminCookie }
    });
    expect(auditRes.statusCode).toBe(200);
    expect(Array.isArray(auditRes.json)).toBe(true);

    const actions = auditRes.json.map((r: any) => r.action);
    expect(actions).toContain('api_key.create');
    expect(actions).toContain('api_key.update');
    expect(actions).toContain('api_key.revoke');
    expect(actions).toContain('admin.service.create');
  });
});
