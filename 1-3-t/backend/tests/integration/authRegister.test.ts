import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaClient } from '@prisma/client';

function firstCookieValue(setCookie: string | string[] | undefined, name: string) {
  if (!setCookie) return undefined;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const item of list) {
    const [pair] = item.split(';');
    const [k, v] = pair.split('=');
    if (k === name) return v;
  }
  return undefined;
}

describe('POST /auth/register', () => {
  const appOrigin = 'http://localhost:5173';
  let app: any;
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://app:app@localhost:5432/app';
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me-please';
    process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? appOrigin;

    const [{ buildApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/infra/db/prisma'),
    ]);

    prisma = prismaModule.prisma;

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('registers user, seeds default categories, and creates session cookie', async () => {
    const bootstrap = await app.inject({ method: 'GET', url: '/session' });
    const csrf = firstCookieValue(bootstrap.headers['set-cookie'], 'csrf');
    expect(csrf).toBeTruthy();

    const email = `u${Date.now()}@example.com`;

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: {
        origin: appOrigin,
        cookie: `csrf=${csrf}`,
        'x-csrf-token': csrf!,
      },
      payload: {
        email,
        password: 'password123',
        passwordConfirm: 'password123',
      },
    });

    expect(res.statusCode).toBe(201);

    const sid = firstCookieValue(res.headers['set-cookie'], 'sid');
    expect(sid).toBeTruthy();

    const sessionRes = await app.inject({
      method: 'GET',
      url: '/session',
      headers: {
        cookie: `sid=${sid}; csrf=${csrf}`,
      },
    });

    expect(sessionRes.statusCode).toBe(200);
    expect(sessionRes.json()).toMatchObject({
      authenticated: true,
      user: {
        email,
      },
    });

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeTruthy();

    const categoryCount = await prisma.category.count({ where: { userId: user!.id } });
    expect(categoryCount).toBe(5);
  });
});
