import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import type { AppConfig } from '../config';

export async function createTestApp(): Promise<{ app: FastifyInstance; config: AppConfig; cleanup: () => Promise<void> }> {
  const apiDir = path.resolve(process.cwd());
  const tmpDir = path.join(apiDir, '.tmp');
  mkdirSync(tmpDir, { recursive: true });

  const dbPath = path.join(tmpDir, `test-${randomUUID()}.db`);
  const databaseUrl = `file:${dbPath}`;

  execSync('./node_modules/.bin/prisma migrate deploy', {
    cwd: apiDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  const config: AppConfig = {
    NODE_ENV: 'test',
    API_PORT: 0,
    WEB_ORIGIN: 'http://localhost:3000',
    DATABASE_URL: databaseUrl,
    COOKIE_SECRET: 'test-cookie-secret-1234567890',
  };

  const app = await buildApp(config);

  async function cleanup() {
    await app.close();
    try {
      rmSync(dbPath, { force: true });
      rmSync(`${dbPath}-journal`, { force: true });
      rmSync(`${dbPath}-wal`, { force: true });
      rmSync(`${dbPath}-shm`, { force: true });
    } catch {
      // ignore
    }
  }

  return { app, config, cleanup };
}

export function cookieHeaderFromSetCookie(setCookie: string[] | undefined): string {
  if (!setCookie || setCookie.length === 0) return '';
  return setCookie.map((c) => c.split(';')[0]).join('; ');
}
