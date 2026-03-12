import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import argon2 from 'argon2';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from './app.harness';

function getCookieHeader(setCookieHeader: string[] | string | undefined) {
  const arr = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
  if (!arr?.length) return '';
  return arr.map((c) => c.split(';')[0]).join('; ');
}

describe('US2: admin catalog → /docs visibility (integration)', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('integration-us2-admin-docs');
  let app: any;
  let adminCookie = '';
  let devCookie = '';

  beforeAll(async () => {
    migrateDatabase(databaseUrl);
    app = await createTestApp({ databaseUrl });

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
    await app?.close();
  });

  it('admin create/disable service+endpoint affects /docs visibility', async () => {
    const createService = await request(app.app.getHttpServer())
      .post('/admin/services')
      .set('cookie', adminCookie)
      .send({ slug: 'svc-us2', name: 'US2 Service', upstreamUrl: 'http://127.0.0.1:1', status: 'ACTIVE' })
      .expect(201);

    const serviceId = createService.body.item.id as string;

    const createEndpoint = await request(app.app.getHttpServer())
      .post('/admin/endpoints')
      .set('cookie', adminCookie)
      .send({ serviceId, name: 'Hello', method: 'GET', pathPattern: '/hello', status: 'ACTIVE' })
      .expect(201);

    const endpointId = createEndpoint.body.item.id as string;

    const createScope = await request(app.app.getHttpServer())
      .post('/admin/scopes')
      .set('cookie', adminCookie)
      .send({ key: 'us2.read', description: 'US2 read', status: 'ACTIVE' })
      .expect(201);

    const scopeId = createScope.body.item.id as string;

    await request(app.app.getHttpServer())
      .post('/admin/scope-rules')
      .set('cookie', adminCookie)
      .send({ endpointId, scopeId })
      .expect(201);

    const docs1 = await request(app.app.getHttpServer()).get('/docs').set('cookie', devCookie).expect(200);

    const svc = (docs1.body.services as any[]).find((s) => s.name === 'US2 Service');
    expect(svc).toBeTruthy();

    const ep = (svc.endpoints as any[]).find((e) => e.path_pattern === '/hello' && e.http_method === 'GET');
    expect(ep).toBeTruthy();
    expect(ep.required_scopes).toContain('us2.read');

    // Disable endpoint; it should disappear from /docs.
    await request(app.app.getHttpServer())
      .patch(`/admin/endpoints/${endpointId}`)
      .set('cookie', adminCookie)
      .send({ status: 'DISABLED' })
      .expect(200);

    const docs2 = await request(app.app.getHttpServer()).get('/docs').set('cookie', devCookie).expect(200);
    const svc2 = (docs2.body.services as any[]).find((s) => s.name === 'US2 Service');
    const hasEndpoint = svc2?.endpoints?.some((e: any) => e.path_pattern === '/hello' && e.http_method === 'GET');
    expect(hasEndpoint).toBe(false);

    // Disable service; it should not appear at all.
    await request(app.app.getHttpServer())
      .patch(`/admin/services/${serviceId}`)
      .set('cookie', adminCookie)
      .send({ status: 'DISABLED' })
      .expect(200);

    const docs3 = await request(app.app.getHttpServer()).get('/docs').set('cookie', devCookie).expect(200);
    const svc3 = (docs3.body.services as any[]).find((s) => s.name === 'US2 Service');
    expect(svc3).toBeFalsy();
  });
});
