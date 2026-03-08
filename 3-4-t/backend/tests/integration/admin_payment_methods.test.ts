import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US4 admin payment methods', () => {
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
    await prisma.paymentMethod.create({
      data: { code: 'card', display_name: 'Card', enabled: true, sort_order: 1 },
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

  it('lists and upserts payment methods', async () => {
    const app = await buildApp();

    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/payment-methods',
      headers: { cookie: adminCookie },
    });
    expect(listRes.statusCode).toBe(200);
    const list = listRes.json();
    expect(list.ok).toBe(true);
    expect(list.data.items.length).toBe(1);
    expect(list.data.items[0].code).toBe('card');

    const upsertRes = await app.inject({
      method: 'PUT',
      url: '/api/admin/payment-methods',
      headers: { cookie: adminCookie },
      payload: { code: 'card', display_name: 'Card', enabled: false, sort_order: 1 },
    });
    expect(upsertRes.statusCode).toBe(200);

    const updated = await prisma.paymentMethod.findUnique({ where: { code: 'card' } });
    expect(updated?.enabled).toBe(false);

    await app.close();
  });
});
