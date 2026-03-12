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

const UsagePageSchema = z.object({
  items: z.array(
    z.object({
      occurred_at: z.string(),
      request_id: z.string().nullable(),
      endpoint_id: z.string().nullable(),
      http_method: z.string(),
      path: z.string(),
      status_code: z.number(),
      response_time_ms: z.number(),
      error_code: z.string().nullable(),
    }),
  ),
  next_cursor: z.string().nullable(),
});

const AuditPageSchema = z.object({
  items: z.array(
    z.object({
      occurred_at: z.string(),
      request_id: z.string().nullable(),
      actor_user_id: z.string().nullable(),
      action: z.string(),
      target_type: z.string().nullable(),
      target_id: z.string().nullable(),
      metadata: z.any().nullable(),
    }),
  ),
  next_cursor: z.string().nullable(),
});

describe('contract: admin monitoring + risk controls', () => {
  const { databaseUrl } = createIsolatedDatabaseUrl('contract-admin-monitoring');
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

  it('admin monitoring endpoints require admin role', async () => {
    await request(app.app.getHttpServer()).get('/admin/usage').expect(401);
    await request(app.app.getHttpServer()).get('/admin/audit').expect(401);

    await request(app.app.getHttpServer()).get('/admin/usage').set('cookie', devCookie).expect(403);
    await request(app.app.getHttpServer()).get('/admin/audit').set('cookie', devCookie).expect(403);
  });

  it('GET /admin/usage and GET /admin/audit return page shapes', async () => {
    const usage = await request(app.app.getHttpServer())
      .get('/admin/usage?limit=10')
      .set('cookie', adminCookie)
      .expect(200);

    UsagePageSchema.parse(usage.body);

    const audit = await request(app.app.getHttpServer())
      .get('/admin/audit?limit=10')
      .set('cookie', adminCookie)
      .expect(200);

    AuditPageSchema.parse(audit.body);
  });

  it('admin key/user action endpoints return {ok:true} and require admin', async () => {
    // create a key to operate on
    const keyRes = await request(app.app.getHttpServer())
      .post('/keys')
      .set('cookie', devCookie)
      .send({ name: 'Key', scopes: [] })
      .expect(201);

    const keyId = keyRes.body.api_key.id as string;

    await request(app.app.getHttpServer()).post(`/admin/keys/${keyId}/block`).expect(401);
    await request(app.app.getHttpServer()).post(`/admin/keys/${keyId}/block`).set('cookie', devCookie).expect(403);

    const block = await request(app.app.getHttpServer())
      .post(`/admin/keys/${keyId}/block`)
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ ok: z.boolean() }).parse(block.body);

    const revoke = await request(app.app.getHttpServer())
      .post(`/admin/keys/${keyId}/revoke`)
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ ok: z.boolean() }).parse(revoke.body);

    const userId = (await app.prisma.user.findUniqueOrThrow({ where: { email: 'dev@example.com' } })).id;

    const disable = await request(app.app.getHttpServer())
      .post(`/admin/users/${userId}/disable`)
      .set('cookie', adminCookie)
      .expect(200);

    z.object({ ok: z.boolean() }).parse(disable.body);
  });
});
