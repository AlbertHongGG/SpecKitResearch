import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient, ResourceStatus, ScopeRuleEffect } from '@prisma/client';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

describe('US1 ApiKeys (create/list)', () => {
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

  it('creates an API key and never returns plaintext in list', async () => {
    const email = 'dev@example.com';
    const password = 'password123';

    await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
    const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
    const cookieHeader = buildCookieHeader(getSetCookieHeader(loginRes.headers));

    const createRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: cookieHeader },
      body: { name: 'my key', scopes: ['demo:read'] }
    });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.json?.api_key_plaintext).toMatch(/^ak_/);

    const listRes = await injectJson(app, {
      method: 'GET',
      url: '/api-keys',
      headers: { cookie: cookieHeader }
    });

    expect(listRes.statusCode).toBe(200);
    expect(Array.isArray(listRes.json)).toBe(true);
    expect(listRes.json.length).toBe(1);
    expect(listRes.json[0].api_key_plaintext).toBeUndefined();
    expect(listRes.json[0].scopes).toEqual(['demo:read']);
  });
});
