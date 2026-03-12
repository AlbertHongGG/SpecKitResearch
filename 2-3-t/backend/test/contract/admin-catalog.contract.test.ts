import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import argon2 from 'argon2';

import { createIsolatedDatabaseUrl, migrateDatabase } from '../helpers/test-db';
import { createTestApp } from '../integration/app.harness';

function getCookieHeader(setCookieHeader: string[] | string | undefined) {
  const arr = typeof setCookieHeader === 'string' ? [setCookieHeader] : setCookieHeader;
  if (!arr?.length) return '';
  return arr.map((c) => c.split(';')[0]).join('; ');
}

const ServiceSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  upstreamUrl: z.string().min(1),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

const EndpointSchema = z.object({
  id: z.string().min(1),
  serviceId: z.string().min(1),
  name: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  pathPattern: z.string().min(1),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

const ScopeSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['ACTIVE', 'DISABLED']),
});

const ScopeRuleItemSchema = z.object({
  id: z.string().min(1),
  endpointId: z.string().min(1),
  scopeId: z.string().min(1),
  scopeKey: z.string().min(1),
});

const DocsSchema = z.object({
  services: z.array(
    z.object({
      name: z.string().min(1),
      endpoints: z.array(
        z.object({
          http_method: z.string().min(1),
          path_pattern: z.string().min(1),
          status: z.enum(['active', 'disabled']),
          required_scopes: z.array(z.string()),
        }),
      ),
    }),
  ),
});

describe('contract: admin catalog + docs', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('contract-admin-catalog');
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

  it('admin endpoints require admin role (developer gets 403)', async () => {
    await request(app.app.getHttpServer()).get('/admin/services').set('cookie', devCookie).expect(403);
    await request(app.app.getHttpServer()).get('/admin/endpoints').set('cookie', devCookie).expect(403);
    await request(app.app.getHttpServer()).get('/admin/scopes').set('cookie', devCookie).expect(403);
    await request(app.app.getHttpServer()).get('/admin/scope-rules').set('cookie', devCookie).expect(403);
  });

  it('GET /docs requires session (but not admin role)', async () => {
    await request(app.app.getHttpServer()).get('/docs').expect(401);

    const res = await request(app.app.getHttpServer()).get('/docs').set('cookie', devCookie).expect(200);
    DocsSchema.parse(res.body);
  });

  it('admin catalog endpoints return expected shapes', async () => {
    const listServices = await request(app.app.getHttpServer())
      .get('/admin/services')
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ items: z.array(ServiceSchema.passthrough()) }).parse(listServices.body);

    const createService = await request(app.app.getHttpServer())
      .post('/admin/services')
      .set('cookie', adminCookie)
      .send({ slug: 'svc1', name: 'Service 1', upstreamUrl: 'http://127.0.0.1:1', status: 'ACTIVE' })
      .expect(201);

    const createdService = z.object({ item: ServiceSchema.passthrough() }).parse(createService.body).item;

    const listEndpoints = await request(app.app.getHttpServer())
      .get('/admin/endpoints')
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ items: z.array(EndpointSchema.passthrough()) }).parse(listEndpoints.body);

    const createEndpoint = await request(app.app.getHttpServer())
      .post('/admin/endpoints')
      .set('cookie', adminCookie)
      .send({
        serviceId: createdService.id,
        name: 'Hello',
        method: 'GET',
        pathPattern: '/hello',
        status: 'ACTIVE',
      })
      .expect(201);

    const createdEndpoint = z.object({ item: EndpointSchema.passthrough() }).parse(createEndpoint.body).item;

    const listScopes = await request(app.app.getHttpServer())
      .get('/admin/scopes')
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ items: z.array(ScopeSchema.passthrough()) }).parse(listScopes.body);

    const createScope = await request(app.app.getHttpServer())
      .post('/admin/scopes')
      .set('cookie', adminCookie)
      .send({ key: 'read:hello', description: 'Read hello', status: 'ACTIVE' })
      .expect(201);

    const createdScope = z.object({ item: ScopeSchema.passthrough() }).parse(createScope.body).item;

    const listRules = await request(app.app.getHttpServer())
      .get('/admin/scope-rules')
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ items: z.array(ScopeRuleItemSchema) }).parse(listRules.body);

    const addRule = await request(app.app.getHttpServer())
      .post('/admin/scope-rules')
      .set('cookie', adminCookie)
      .send({ endpointId: createdEndpoint.id, scopeId: createdScope.id })
      .expect(201);

    z.object({ item: z.object({ id: z.string().min(1), endpointId: z.string(), scopeId: z.string() }).passthrough() }).parse(
      addRule.body,
    );

    const listRules2 = await request(app.app.getHttpServer())
      .get(`/admin/scope-rules?endpointId=${encodeURIComponent(createdEndpoint.id)}`)
      .set('cookie', adminCookie)
      .expect(200);

    const parsedRules2 = z.object({ items: z.array(ScopeRuleItemSchema) }).parse(listRules2.body);
    expect(parsedRules2.items.some((r) => r.scopeKey === 'read:hello')).toBe(true);

    // delete rule shape
    const del = await request(app.app.getHttpServer())
      .delete(`/admin/scope-rules?endpointId=${encodeURIComponent(createdEndpoint.id)}&scopeId=${encodeURIComponent(createdScope.id)}`)
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ ok: z.boolean() }).parse(del.body);
  });
});
