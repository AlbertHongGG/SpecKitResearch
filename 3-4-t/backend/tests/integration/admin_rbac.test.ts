import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('US4 admin RBAC', () => {
  let prisma: PrismaClient;
  let devCookie: string;
  let adminCookie: string;

  beforeAll(async () => {
    const { url } = createTestDatabaseUrl();
    process.env.DATABASE_URL = url;
    process.env.COOKIE_SIGNING_SECRET = 'test_cookie_signing_secret_123456';
    migrateTestDatabase({ cwd: `${process.cwd()}`, databaseUrl: url });

    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.user.create({
      data: {
        email: 'dev@example.com',
        password_hash: await hashPassword('password123'),
        role: 'USER_DEVELOPER',
      },
    });
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password_hash: await hashPassword('password123'),
        role: 'ADMIN',
      },
    });

    const app = await buildApp();
    const devLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev@example.com', password: 'password123' },
    });
    const devSetCookie = devLogin.headers['set-cookie'];
    devCookie = Array.isArray(devSetCookie) ? devSetCookie.join(';') : (devSetCookie as string);

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@example.com', password: 'password123' },
    });
    const adminSetCookie = adminLogin.headers['set-cookie'];
    adminCookie = Array.isArray(adminSetCookie)
      ? adminSetCookie.join(';')
      : (adminSetCookie as string);

    await app.close();
  });

  it('USER_DEVELOPER gets 403 on admin endpoints', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/payment-methods',
      headers: { cookie: devCookie },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('ADMIN can access admin endpoints', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/payment-methods',
      headers: { cookie: adminCookie },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
