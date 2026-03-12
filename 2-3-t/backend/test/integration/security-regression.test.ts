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

async function waitForCounts(prisma: any, params: { usageAtLeast: number; auditAtLeast: number }) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const [usageCount, auditCount] = await Promise.all([
      prisma.usageLog.count(),
      prisma.auditLog.count(),
    ]);
    if (usageCount >= params.usageAtLeast && auditCount >= params.auditAtLeast) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe('security regression: no secrets in logs/audit/usage (integration)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('integration-security-regression');
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
    await upstream.listen({ port: 0, host: '127.0.0.1' });
    const addr = upstream.server.address();
    if (!addr || typeof addr === 'string') throw new Error('Failed to bind upstream server');
    upstreamBaseUrl = `http://127.0.0.1:${addr.port}`;

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

  it('does not persist Authorization/cookie/plain_key in audit_logs or usage_logs', async () => {
    await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(201);

    const login = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);

    const cookieHeader = getCookieHeader(login.headers['set-cookie']);

    const keyCreate = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', cookieHeader)
      .send({ name: 'Key', scopes: [scopeKey], rate_limit_per_minute: 10, rate_limit_per_hour: 10 })
      .expect(201);

    const keyToken = keyCreate.body.plain_key as string;

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${keyToken}`)
      .expect(200);

    // Trigger another sensitive action with session cookie in request headers.
    await request(app.app.getHttpServer())
      .post(`/keys/${keyCreate.body.api_key.id}/revoke`)
      .set('cookie', cookieHeader)
      .expect(200);

    await waitForCounts(app.prisma, { usageAtLeast: 1, auditAtLeast: 2 });

    const [usageLogs, auditLogs] = await Promise.all([
      app.prisma.usageLog.findMany({ orderBy: { createdAt: 'asc' } }),
      app.prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const haystack = JSON.stringify({ usageLogs, auditLogs });

    expect(haystack).not.toContain(keyToken);
    expect(haystack).not.toContain('Bearer ');
    expect(haystack).not.toContain('authorization');
    expect(haystack).not.toContain('cookie');
    expect(haystack).not.toContain('set-cookie');
    expect(haystack).not.toContain('plain_key');
    expect(haystack).not.toContain('sk_');
  });
});
