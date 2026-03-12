import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from './app.harness';

function getCookieHeader(setCookieHeader: string[] | string | undefined) {
  const arr = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
  if (!arr?.length) return '';
  return arr.map((c) => c.split(';')[0]).join('; ');
}

async function waitForUsageCount(prisma: any, keyId: string, atLeast: number) {
  const deadline = Date.now() + 2000;
  // poll: usage writer flushes async on interval
  while (Date.now() < deadline) {
    const count = await prisma.usageLog.count({ where: { keyId } });
    if (count >= atLeast) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  const count = await prisma.usageLog.count({ where: { keyId } });
  throw new Error(`Timed out waiting for usage logs for key ${keyId}; have=${count} want>=${atLeast}`);
}

describe('US1: gateway 401/403/429/404 + usage (integration)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('integration-us1-gateway');
  let app: any;
  let upstream: any;
  let upstreamBaseUrl: string;

  const serviceSlug = 'svc';
  const scopeKey = 'read:hello';

  beforeAll(async () => {
    migrateDatabase(databaseUrl);
    app = await createTestApp({ databaseUrl });

    upstream = Fastify({ logger: false });
    upstream.get('/hello', async () => ({ ok: true }));
    upstream.get('/slow', async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { ok: true };
    });

    await upstream.listen({ port: 0, host: '127.0.0.1' });
    const addr = upstream.server.address();
    if (!addr || typeof addr === 'string') throw new Error('Failed to bind upstream server');
    upstreamBaseUrl = `http://127.0.0.1:${addr.port}`;

    // Seed service/endpoint/scope allow rules.
    const scope = await app.prisma.apiScope.create({
      data: { key: scopeKey, description: 'hello scope', status: 'ACTIVE' },
    });

    const service = await app.prisma.apiService.create({
      data: { slug: serviceSlug, name: 'Service', upstreamUrl: upstreamBaseUrl, status: 'ACTIVE' },
    });

    const endpoint = await app.prisma.apiEndpoint.create({
      data: {
        serviceId: service.id,
        name: 'Hello',
        method: 'GET',
        pathPattern: '/hello',
        status: 'ACTIVE',
      },
    });

    await app.prisma.endpointScopeAllow.create({ data: { endpointId: endpoint.id, scopeId: scope.id } });
  });

  afterAll(async () => {
    await upstream?.close();
    await app?.close();
  });

  it('logs allowed and denied gateway calls to /keys/:id/usage', async () => {
    await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(201);

    const login = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);

    const cookieHeader = getCookieHeader(login.headers['set-cookie']);

    // Key with scope and very low minute limit to trigger 429.
    const key1Create = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'Scoped', scopes: [scopeKey], rate_limit_per_minute: 1, rate_limit_per_hour: 10 })
      .expect(201);

    const key1Id = key1Create.body.api_key.id as string;
    const key1Token = key1Create.body.plain_key as string;

    // Allowed (200)
    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${key1Token}`)
      .expect(200);

    // Rate limited (429)
    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${key1Token}`)
      .expect(429);

    // Wrong secret but existing key id (401) -> should still be attributed to the key.
    const wrongSecretToken = `sk_${key1Id}_WRONG_SECRET`;
    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${wrongSecretToken}`)
      .expect(401);

    // Endpoint not found (404) after key is verified.
    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/missing`)
      .set('authorization', `Bearer ${key1Token}`)
      .expect(404);

    // Another key without scopes (403)
    const key2Create = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'Unscoped', scopes: [], rate_limit_per_minute: 10, rate_limit_per_hour: 10 })
      .expect(201);

    const key2Id = key2Create.body.api_key.id as string;
    const key2Token = key2Create.body.plain_key as string;

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${key2Token}`)
      .expect(403);

    // Wait for async usage writer to flush.
    await waitForUsageCount(app.prisma, key1Id, 4);
    await waitForUsageCount(app.prisma, key2Id, 1);

    const usage1 = await request(app.app.getHttpServer())
      .get(`/keys/${key1Id}/usage?limit=50`)
      .set('cookie', cookieHeader)
      .expect(200);

    const statuses1 = (usage1.body.items as any[]).map((r) => r.status_code);
    expect(statuses1).toContain(200);
    expect(statuses1).toContain(401);
    expect(statuses1).toContain(404);
    expect(statuses1).toContain(429);

    // must not leak key token
    expect(JSON.stringify(usage1.body)).not.toContain(key1Token);

    const usage2 = await request(app.app.getHttpServer())
      .get(`/keys/${key2Id}/usage?limit=50`)
      .set('cookie', cookieHeader)
      .expect(200);

    const statuses2 = (usage2.body.items as any[]).map((r) => r.status_code);
    expect(statuses2).toContain(403);
    expect(JSON.stringify(usage2.body)).not.toContain(key2Token);
  });
});
