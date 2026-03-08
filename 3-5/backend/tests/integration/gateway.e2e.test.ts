import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient, ResourceStatus, ScopeRuleEffect } from '@prisma/client';

import { setupTestDb } from './_helpers/test-db';
import { buildCookieHeader, createTestApp, getSetCookieHeader, injectJson } from './_helpers/test-app';

async function waitFor<T>(fn: () => Promise<T>, predicate: (t: T) => boolean, ms = 1500): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const value = await fn();
    if (predicate(value)) return value;
    if (Date.now() - start > ms) return value;
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe('US1 Gateway (401/403/429/200 + usage log)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaClient;
  let cleanupDb: (() => void) | undefined;

  beforeAll(async () => {
    const db = setupTestDb();
    cleanupDb = db.cleanup;
    prisma = new PrismaClient();
    app = await createTestApp();

    // Seed catalog required for resolver + scopes.
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

  it('rejects missing bearer token (401)', async () => {
    const res = await injectJson(app, { method: 'GET', url: '/gateway/demo/demo/ping' });
    expect(res.statusCode).toBe(401);
  });

  it('allows valid key and records usage; enforces scope and rate limit', async () => {
    const email = 'dev@example.com';
    const password = 'password123';

    await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
    const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
    const cookieHeader = buildCookieHeader(getSetCookieHeader(loginRes.headers));

    // Create a key that can call demo endpoint, but only once per minute.
    const createKeyRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: cookieHeader },
      body: { name: 'gateway key', scopes: ['demo:read'], rate_limit_per_minute: 1 }
    });
    expect(createKeyRes.statusCode).toBe(201);
    const plaintext = createKeyRes.json?.api_key_plaintext as string;
    expect(plaintext).toMatch(/^ak_/);

    const okRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${plaintext}` }
    });
    expect(okRes.statusCode).toBe(200);

    const limitedRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${plaintext}` }
    });
    expect(limitedRes.statusCode).toBe(429);
    expect(String(limitedRes.headers['retry-after'] ?? '')).not.toBe('');

    // Create a key without scopes and expect 403.
    const noScopeRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie: cookieHeader },
      body: { name: 'no scope', scopes: [] }
    });
    const noScopeKey = noScopeRes.json?.api_key_plaintext as string;

    const forbiddenRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${noScopeKey}` }
    });
    expect(forbiddenRes.statusCode).toBe(403);

    // Usage logs are eventual; poll until at least 1 entry exists.
    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();

    const logsRes = await waitFor(
      async () =>
        injectJson(app, {
          method: 'GET',
          url: `/usage-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          headers: { cookie: cookieHeader }
        }),
      (r) => r.statusCode === 200 && Array.isArray(r.json) && r.json.length >= 1,
      2000,
    );

    expect(logsRes.statusCode).toBe(200);
    expect(Array.isArray(logsRes.json)).toBe(true);
    expect(logsRes.json.some((l: any) => String(l.path).includes('/gateway/demo/demo/ping'))).toBe(true);
  });
});
