import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll } from 'vitest';

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

export function withIntegrationContext() {
  const appOrigin = 'http://localhost:5173';

  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'file:./prisma/test.db';
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me-please';
    process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? appOrigin;

    const [{ buildApp }, prismaModule] = await Promise.all([
      import('../../src/app'),
      import('../../src/infra/db/prisma'),
    ]);

    prisma = prismaModule.prisma as PrismaClient;
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  async function resetDb() {
    await prisma.transaction.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});
  }

  async function registerUser(args?: { email?: string; password?: string }) {
    const email = args?.email ?? `u${Date.now()}@example.com`;
    const password = args?.password ?? 'password123';

    const bootstrap = await app.inject({ method: 'GET', url: '/session' });
    const csrf = firstCookieValue(bootstrap.headers['set-cookie'], 'csrf');
    if (!csrf) throw new Error('missing csrf cookie from /session');

    const res = await app.inject({
      method: 'POST',
      url: '/auth/register',
      headers: {
        origin: appOrigin,
        cookie: `csrf=${csrf}`,
        'x-csrf-token': csrf,
      },
      payload: {
        email,
        password,
        passwordConfirm: password,
      },
    });

    const sid = firstCookieValue(res.headers['set-cookie'], 'sid');
    if (!sid) throw new Error('missing sid cookie from /auth/register');

    return {
      email,
      password,
      csrf,
      sid,
      cookieHeader: `sid=${sid}; csrf=${csrf}`,
      csrfHeaders: {
        origin: appOrigin,
        cookie: `sid=${sid}; csrf=${csrf}`,
        'x-csrf-token': csrf,
      } as Record<string, string>,
    };
  }

  return {
    get app() {
      return app;
    },
    get prisma() {
      return prisma;
    },
    appOrigin,
    resetDb,
    registerUser,
  };
}
