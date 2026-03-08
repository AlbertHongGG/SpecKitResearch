import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US4 admin settings', () => {
  let prisma: PrismaClient;
  let adminCookie: string;

  beforeAll(async () => {
    const { url } = createTestDatabaseUrl();
    process.env.DATABASE_URL = url;
    process.env.COOKIE_SIGNING_SECRET = 'test_cookie_signing_secret_123456';
    migrateTestDatabase({ cwd: `${process.cwd()}`, databaseUrl: url });

    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password_hash: await hashPassword('password123'),
        role: 'ADMIN',
      },
    });
    await prisma.systemSetting.upsert({
      where: { key: 'allowed_currencies' },
      update: {},
      create: { key: 'allowed_currencies', value_json: ['TWD', 'USD', 'JPY'] },
    });
    await prisma.systemSetting.upsert({
      where: { key: 'default_return_method' },
      update: {},
      create: { key: 'default_return_method', value_json: 'query_string' },
    });
    await prisma.systemSetting.upsert({
      where: { key: 'session_ttl_sec' },
      update: {},
      create: { key: 'session_ttl_sec', value_json: 8 * 60 * 60 },
    });

    const app = await buildApp();
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'password123' },
    });
    const setCookie = loginRes.headers['set-cookie'];
    adminCookie = Array.isArray(setCookie) ? setCookie.join(';') : (setCookie as string);
    await app.close();
  });

  it('gets and updates settings', async () => {
    const app = await buildApp();

    const getRes = await app.inject({
      method: 'GET',
      url: '/api/admin/settings',
      headers: { cookie: adminCookie },
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json();
    expect(getBody.ok).toBe(true);
    expect(getBody.data.allowed_currencies).toEqual(['TWD', 'USD', 'JPY']);
    expect(getBody.data.default_return_method).toBe('query_string');
    expect(getBody.data.session_ttl_hours).toBe(8);
    expect(getBody.data.webhook_signing.active_secret_id).toBeTruthy();

    const putRes = await app.inject({
      method: 'PUT',
      url: '/api/admin/settings',
      headers: { cookie: adminCookie },
      payload: {
        session_ttl_hours: 6,
        allowed_currencies: ['TWD'],
        default_return_method: 'post_form',
        webhook_signing: {
          active_secret_id: getBody.data.webhook_signing.active_secret_id,
          previous_secret_id: getBody.data.webhook_signing.previous_secret_id,
          previous_secret_grace_period_hours: 24,
        },
      },
    });
    expect(putRes.statusCode).toBe(200);

    const allowed = await prisma.systemSetting.findUnique({ where: { key: 'allowed_currencies' } });
    expect(allowed?.value_json).toEqual(['TWD']);

    await app.close();
  });
});
