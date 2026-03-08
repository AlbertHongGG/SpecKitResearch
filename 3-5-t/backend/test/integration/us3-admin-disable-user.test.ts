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

describe('US3: admin disable user (integration)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('integration-us3-admin-disable-user');
  let app: any;
  let upstream: any;
  let upstreamBaseUrl: string;
  let adminCookie = '';
  let devCookie = '';
  let devUserId = '';
  let devKeyToken = '';

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

    devUserId = (await app.prisma.user.findUniqueOrThrow({ where: { email: 'dev@example.com' } })).id;

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

    const keyCreate = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', devCookie)
      .send({ name: 'Key', scopes: [scopeKey], rate_limit_per_minute: 10, rate_limit_per_hour: 10 })
      .expect(201);

    devKeyToken = keyCreate.body.plain_key as string;

    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${devKeyToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await upstream?.close();
    await app?.close();
  });

  it('disable user revokes sessions, blocks login, and invalidates keys', async () => {
    await request(app.app.getHttpServer())
      .post(`/admin/users/${devUserId}/disable`)
      .set('cookie', adminCookie)
      .expect(200);

    // Old session should be revoked.
    const sess = await request(app.app.getHttpServer()).get('/session').set('cookie', devCookie).expect(200);
    expect(sess.body.authenticated).toBe(false);

    // Cannot create keys with revoked session.
    await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', devCookie)
      .send({ name: 'ShouldFail', scopes: [] })
      .expect(401);

    // Gateway should now reject the existing key.
    await request(app.app.getHttpServer())
      .get(`/gateway/${serviceSlug}/hello`)
      .set('authorization', `Bearer ${devKeyToken}`)
      .expect(401);

    // Login should fail for disabled user.
    await request(app.app.getHttpServer())
      .post('/login')
      .send({ email: 'dev@example.com', password: 'correct-horse-battery-staple' })
      .expect(401);

    await waitForAuditAction(app.prisma, 'admin.user.disable', 1);
  });
});
