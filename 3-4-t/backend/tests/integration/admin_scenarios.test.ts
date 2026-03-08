import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US4 admin scenario templates', () => {
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
    await prisma.simulationScenarioTemplate.create({
      data: {
        type: 'success',
        default_delay_sec: 0,
        default_error_code: null,
        default_error_message: null,
        enabled: true,
      },
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

  it('lists and upserts scenario templates', async () => {
    const app = await buildApp();

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/scenario-templates',
      headers: { cookie: adminCookie },
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(list.ok).toBe(true);
    expect(list.data.items.length).toBe(1);
    expect(list.data.items[0].type).toBe('success');

    const upsertRes = await app.inject({
      method: 'PUT',
      url: '/api/admin/scenario-templates',
      headers: { cookie: adminCookie },
      payload: {
        type: 'success',
        default_delay_sec: 2,
        default_error_code: null,
        default_error_message: null,
        enabled: true,
      },
    });
    expect(upsertRes.statusCode).toBe(200);

    const updated = await prisma.simulationScenarioTemplate.findFirst({ where: { type: 'success' } });
    expect(updated?.default_delay_sec).toBe(2);

    await app.close();
  });
});
