import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const DEFAULT_HOST = 'localhost:3000';
const DEFAULT_PROTO = 'http';

export type ApiTestEnv = {
  baseUrl: string;
  host: string;
  proto: string;
  databaseUrl: string;
  dbFilePath: string;
};

export function makeBaseHeaders(opts?: { host?: string; proto?: string; origin?: string }) {
  const host = opts?.host ?? DEFAULT_HOST;
  const proto = opts?.proto ?? DEFAULT_PROTO;
  const origin = opts?.origin ?? `${proto}://${host}`;

  return {
    host,
    'x-forwarded-proto': proto,
    origin,
  };
}

export function setupApiTestEnv(): ApiTestEnv {
  const host = DEFAULT_HOST;
  const proto = DEFAULT_PROTO;
  const baseUrl = `${proto}://${host}`;

  process.env.NODE_ENV = 'test';
  process.env.AUTH_SECRET ??= 'test_auth_secret_32_chars_minimum';
  process.env.AUTH_COOKIE_NAME ??= 'auth_session';
  process.env.APP_URL ??= baseUrl;

  // If a test DB is already configured (e.g. via Vitest setupFiles), reuse it.
  // This avoids overriding DATABASE_URL after Prisma has already been instantiated.
  const existingDatabaseUrl = process.env.DATABASE_URL;
  if (existingDatabaseUrl && existingDatabaseUrl.startsWith('file:')) {
    const dbFilePath = existingDatabaseUrl.slice('file:'.length);
    return {
      baseUrl: process.env.APP_URL ?? baseUrl,
      host,
      proto,
      databaseUrl: existingDatabaseUrl,
      dbFilePath,
    };
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const dbDir = join(here, '..', '.tmp-db');
  mkdirSync(dbDir, { recursive: true });

  const dbFilePath = join(dbDir, `test-${process.pid}-${randomUUID()}.db`);
  rmSync(dbFilePath, { force: true });

  const databaseUrl = `file:${dbFilePath}`;
  process.env.DATABASE_URL = databaseUrl;

  return { baseUrl, host, proto, databaseUrl, dbFilePath };
}

export function migrateTestDb() {
  // Run migrations against the test database pointed to by DATABASE_URL.
  execSync('pnpm prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}

export async function wipeDb() {
  const { prisma } = await import('@/lib/server/db');
  // Order matters due to FK constraints.
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDb() {
  const { prisma } = await import('@/lib/server/db');
  await prisma.$disconnect();
}
