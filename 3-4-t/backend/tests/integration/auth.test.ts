import { beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { hashPassword } from '../../src/domain/auth/password';
import { createTestDatabaseUrl, migrateTestDatabase } from '../test_db';

describe('auth routes', () => {
  let prisma: PrismaClient;

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
  });

  it('login sets session cookie and /me returns authenticated', async () => {
    const app = await buildApp();
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'dev@example.com', password: 'password123' },
    });

    expect(loginRes.statusCode).toBe(200);
    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeTruthy();

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        cookie: Array.isArray(cookie) ? cookie.join(';') : cookie,
      },
    });

    const me = meRes.json();
    expect(me.ok).toBe(true);
    expect(me.data.authenticated).toBe(true);
    await app.close();
  });
});
