import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import argon2 from 'argon2';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from './app.harness';

function getCookieHeader(setCookieHeader: string[] | string | undefined) {
  const arr = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
  if (!arr?.length) return '';
  return arr.map((c) => c.split(';')[0]).join('; ');
}

async function waitForAuditAction(prisma: any, action: string, atLeast: number) {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const count = await prisma.auditLog.count({ where: { action } });
    if (count >= atLeast) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  const count = await prisma.auditLog.count({ where: { action } });
  throw new Error(`Timed out waiting for audit action ${action}; have=${count} want>=${atLeast}`);
}

describe('US3: admin key actions block/revoke (integration)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('integration-us3-admin-key-actions');
  let app: any;
  let upstream: any;
  let upstreamBaseUrl: string;
  let adminCookie = '';
  let devCookie = '';

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

    await app.prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: await argon2.hash('admin-admin-admin'),
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    await request(app.app.getHttpServer())
      .post('/register')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(201);

    const adminLogin = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'admin@example.com', password: 'admin-admin-admin' })
      .expect(200);
    adminCookie = getCookieHeader(adminLogin.headers['set-cookie']);
    expect(adminCookie).toContain('sid=');

    const devLogin = await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(200);
    devCookie = getCookieHeader(devLogin.headers['set-cookie']);
    expect(devCookie).toContain('sid=');
  });

  afterAll(async () => {
    await upstream?.close();
    await app?.close();
  });

  it('block key makes gateway return 401 and creates audit log', async () => {
    const keyCreate = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', devCookie)
      .send({ name: 'KeyToBlock', scopes: [scopeKey], rate_limit_per_minute: 10, rate_limit_per_hour: 10 })
      .expect(201);

    const keyId = keyCreate.body.api_key.id as string;
    const token = keyCreate.body.plain_key as string;

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.app.getHttpServer())
      .post(`/admin/keys/${keyId}/block`)
      .set('cookie', adminCookie)
      .expect(200);

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${token}`)
      .expect(401);

    await waitForAuditAction(app.prisma, 'admin.key.block', 1);
  });

  it('revoke key makes gateway return 401 and creates audit log', async () => {
    const keyCreate = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', devCookie)
      .send({ name: 'KeyToRevoke', scopes: [scopeKey], rate_limit_per_minute: 10, rate_limit_per_hour: 10 })
      .expect(201);

    const keyId = keyCreate.body.api_key.id as string;
    const token = keyCreate.body.plain_key as string;

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.app.getHttpServer())
      .post(`/admin/keys/${keyId}/revoke`)
      .set('cookie', adminCookie)
      .expect(200);

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${token}`)
      .expect(401);

    await waitForAuditAction(app.prisma, 'admin.key.revoke', 1);
  });
});
