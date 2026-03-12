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

async function registerAndLogin(app: NestFastifyApplication, email: string, password: string): Promise<string> {
  await injectJson(app, { method: 'POST', url: '/register', body: { email, password } });
  const loginRes = await injectJson(app, { method: 'POST', url: '/login', body: { email, password } });
  return buildCookieHeader(getSetCookieHeader(loginRes.headers));
}

describe('US2 UsageLogs (filters)', () => {
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
    const demoRead = await prisma.apiScope.create({
      data: { name: 'demo:read', description: 'demo scope' }
    });
    await prisma.apiScopeRule.create({
      data: { scopeId: demoRead.id, endpointId: endpoint.id, effect: ScopeRuleEffect.allow }
    });
    await prisma.apiScope.create({
      data: { name: 'other:read', description: 'other scope' }
    });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
    cleanupDb?.();
  });

  it('filters by status_code and endpoint (method+path or endpoint_id)', async () => {
    const cookie = await registerAndLogin(app, 'dev@example.com', 'password123');

    const okKeyRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'ok', scopes: ['demo:read'], rate_limit_per_minute: 1 }
    });
    expect(okKeyRes.statusCode).toBe(201);
    const okPlaintext = okKeyRes.json?.api_key_plaintext as string;

    const okRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${okPlaintext}` }
    });
    expect(okRes.statusCode).toBe(200);

    const limitedRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${okPlaintext}` }
    });
    expect(limitedRes.statusCode).toBe(429);

    const forbiddenKeyRes = await injectJson(app, {
      method: 'POST',
      url: '/api-keys',
      headers: { cookie },
      body: { name: 'forbidden', scopes: ['other:read'] }
    });
    expect(forbiddenKeyRes.statusCode).toBe(201);
    const forbiddenPlaintext = forbiddenKeyRes.json?.api_key_plaintext as string;

    const forbiddenRes = await injectJson(app, {
      method: 'GET',
      url: '/gateway/demo/demo/ping',
      headers: { authorization: `Bearer ${forbiddenPlaintext}` }
    });
    expect(forbiddenRes.statusCode).toBe(403);

    const from = new Date(Date.now() - 60_000).toISOString();
    const to = new Date(Date.now() + 60_000).toISOString();

    const allLogsRes = await waitFor(
      async () =>
        injectJson(app, {
          method: 'GET',
          url: `/usage-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          headers: { cookie }
        }),
      (r) => r.statusCode === 200 && Array.isArray(r.json) && r.json.length >= 3,
      2500,
    );

    expect(allLogsRes.statusCode).toBe(200);
    expect(Array.isArray(allLogsRes.json)).toBe(true);

    const endpointId = (allLogsRes.json as any[]).find((l) => l.endpoint_id)?.endpoint_id as string | undefined;
    expect(typeof endpointId).toBe('string');

    const endpoint = encodeURIComponent('GET /gateway/demo/demo/ping');
    const endpointLogsRes = await injectJson(app, {
      method: 'GET',
      url: `/usage-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&endpoint=${endpoint}`,
      headers: { cookie }
    });
    expect(endpointLogsRes.statusCode).toBe(200);
    expect((endpointLogsRes.json as any[]).every((l) => l.http_method === 'GET' && l.path === '/gateway/demo/demo/ping'))
      .toBe(true);

    const status429Res = await injectJson(app, {
      method: 'GET',
      url: `/usage-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status_code=429`,
      headers: { cookie }
    });
    expect(status429Res.statusCode).toBe(200);
    expect((status429Res.json as any[]).length).toBeGreaterThanOrEqual(1);
    expect((status429Res.json as any[]).every((l) => l.status_code === 429)).toBe(true);

    const endpointIdRes = await injectJson(app, {
      method: 'GET',
      url: `/usage-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&endpoint=${encodeURIComponent(
        endpointId!,
      )}`,
      headers: { cookie }
    });
    expect(endpointIdRes.statusCode).toBe(200);
    expect((endpointIdRes.json as any[]).length).toBeGreaterThanOrEqual(1);
    expect((endpointIdRes.json as any[]).every((l) => l.endpoint_id === endpointId)).toBe(true);
  });
});
