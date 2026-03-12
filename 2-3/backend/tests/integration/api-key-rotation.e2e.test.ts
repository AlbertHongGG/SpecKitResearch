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

describe('US2 ApiKeys (rotation)', () => {
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
    const scope = await prisma.apiScope.create({
      data: { name: 'demo:read', description: 'demo scope' }
    });
    await prisma.apiScopeRule.create({
      data: { scopeId: scope.id, endpointId: endpoint.id, effect: ScopeRuleEffect.allow }
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    cleanupDb?.();
  });

  it('creates a new key that replaces the old key and revokes the old key immediately', async () => {
    const cookie = await registerAndLogin(app, 'dev@example.com', 'password123');

    const oldCreateRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'old', scopes: ['demo:read'] }
    });
    expect(oldCreateRes.statusCode).toBe(201);
    const oldKeyId = oldCreateRes.json?.api_key_id as string;
    const oldPlaintext = oldCreateRes.json?.api_key_plaintext as string;

    // Old key works.
    const oldOkRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${oldPlaintext}` }
    });
    expect(oldOkRes.statusCode).toBe(200);

    const newCreateRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'new', scopes: ['demo:read'], replaces_api_key_id: oldKeyId }
    });
    expect(newCreateRes.statusCode).toBe(201);
    const newKeyId = newCreateRes.json?.api_key_id as string;
    const newPlaintext = newCreateRes.json?.api_key_plaintext as string;
    expect(newKeyId).not.toBe(oldKeyId);

    // New key works.
    const newOkRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${newPlaintext}` }
    });
    expect(newOkRes.statusCode).toBe(200);

    // Old key is revoked immediately.
    const oldUnauthorizedRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${oldPlaintext}` }
    });
    expect(oldUnauthorizedRes.statusCode).toBe(401);

    // List should show replaced_by_key_id on the old key.
    const listRes = await injectJson(app, { method: 'GET', url: '/api-keys', headers: { cookie } });
    expect(listRes.statusCode).toBe(200);
    const old = (listRes.json as any[]).find((k) => k.api_key_id === oldKeyId);
    const neu = (listRes.json as any[]).find((k) => k.api_key_id === newKeyId);
    expect(old?.status).toBe('revoked');
    expect(old?.replaced_by_key_id).toBe(newKeyId);
    expect(old?.revoked_at).not.toBeNull();
    expect(neu?.status).toBe('active');
    expect(neu?.replaced_by_key_id).toBeNull();
  });
});
