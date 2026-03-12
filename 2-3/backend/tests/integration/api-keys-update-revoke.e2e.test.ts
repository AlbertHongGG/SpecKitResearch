import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient, ResourceStatus, ScopeRuleEffect } from '@prisma/client';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

async function registerAndLogin(app: NestFastifyApplication, email: string, password: string): Promise<string> {
  await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
  const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
  return buildCookieHeader(getSetCookieHeader(loginRes.headers));
}

describe('US2 ApiKeys (update/revoke)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaClient;
  let cleanupDb: (() => void) | undefined;

  beforeAll(async () => {
    const db = setupTestDb();
    cleanupDb = db.cleanup;
    prisma = new PrismaClient();
    app = await createTestApp();

    // Seed minimal catalog for scopes.
    const demoService = await prisma.apiService.create({
      data: { name: 'demo', description: 'demo', status: ResourceStatus.active }
    });
    const endpoint = await prisma.apiEndpoint.create({
      data: {
        serviceId: demoService.id,
        method: 'GET',
        path: '/demo/ping',
        status: ResourceStatus.active
      }
    });

    const demoRead = await prisma.apiScope.create({
      data: { name: 'demo:read', description: 'demo scope' }
    });
    await prisma.apiScopeRule.create({
      data: { scopeId: demoRead.id, endpointId: endpoint.id, effect: ScopeRuleEffect.allow }
    });

    // A valid-but-not-allowed scope, used to test scope updates.
    await prisma.apiScope.create({
      data: { name: 'other:read', description: 'other scope' }
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    cleanupDb?.();
  });

  it('updates key metadata only when active and owned by the session user', async () => {
    const cookie = await registerAndLogin(app, 'dev@example.com', 'password123');

    const createRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'old name', scopes: ['demo:read'] }
    });
    expect(createRes.statusCode).toBe(201);
    const apiKeyId = createRes.json?.api_key_id as string;

    const newExpiresAt = new Date(Date.now() + 3600_000).toISOString();
    const patchRes = await injectJson(app, {
      method: 'PATCH',
      url: `/api-keys/${apiKeyId}`,
      headers: { cookie },
      body: {
        name: 'new name',
        scopes: ['other:read'],
        expires_at: newExpiresAt,
        rate_limit_per_minute: 10,
        rate_limit_per_hour: 100
      }
    });

    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json?.api_key_id).toBe(apiKeyId);
    expect(patchRes.json?.name).toBe('new name');
    expect(patchRes.json?.scopes).toEqual(['other:read']);
    expect(patchRes.json?.status).toBe('active');
    expect(patchRes.json?.expires_at).toBe(newExpiresAt);
    expect(patchRes.json?.rate_limit_per_minute).toBe(10);
    expect(patchRes.json?.rate_limit_per_hour).toBe(100);

    // A different developer cannot update it.
    const otherCookie = await registerAndLogin(app, 'other@example.com', 'password123');
    const forbiddenRes = await injectJson(app, {
      method: 'PATCH',
      url: `/api-keys/${apiKeyId}`,
      headers: { cookie: otherCookie },
      body: { name: 'hacked' }
    });
    expect(forbiddenRes.statusCode).toBe(403);
  });

  it('revokes a key immediately and prevents further updates (409)', async () => {
    const cookie = await registerAndLogin(app, 'dev2@example.com', 'password123');

    const createRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'to revoke', scopes: ['demo:read'] }
    });
    expect(createRes.statusCode).toBe(201);
    const apiKeyId = createRes.json?.api_key_id as string;
    const plaintext = createRes.json?.api_key_plaintext as string;

    const revokeRes = await injectJson(app, {
      method: 'POST',
      url: `/api-keys/${apiKeyId}/revoke`,
      headers: { cookie }
    });
    expect(revokeRes.statusCode).toBe(204);

    // Gateway must reject immediately.
    const gatewayRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${plaintext}` }
    });
    expect(gatewayRes.statusCode).toBe(401);

    // Key becomes revoked in the list.
    const listRes = await injectJson(app, { method: 'GET', url: '/api-keys', headers: { cookie } });
    expect(listRes.statusCode).toBe(200);
    const key = (listRes.json as any[]).find((k) => k.api_key_id === apiKeyId);
    expect(key?.status).toBe('revoked');
    expect(key?.revoked_at).not.toBeNull();

    // Updating a revoked key must be rejected as conflict.
    const patchRes = await injectJson(app, {
      method: 'PATCH',
      url: `/api-keys/${apiKeyId}`,
      headers: { cookie },
      body: { name: 'should fail' }
    });
    expect(patchRes.statusCode).toBe(409);
  });

  it('does not allow revoking another developer\'s key (403)', async () => {
    const cookieA = await registerAndLogin(app, 'a@example.com', 'password123');
    const cookieB = await registerAndLogin(app, 'b@example.com', 'password123');

    const createRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: cookieB },
      body: { name: 'b key', scopes: ['demo:read'] }
    });
    expect(createRes.statusCode).toBe(201);
    const apiKeyId = createRes.json?.api_key_id as string;

    const revokeRes = await injectJson(app, {
      method: 'POST',
      url: `/api-keys/${apiKeyId}/revoke`,
      headers: { cookie: cookieA }
    });
    expect(revokeRes.statusCode).toBe(403);
  });
});
