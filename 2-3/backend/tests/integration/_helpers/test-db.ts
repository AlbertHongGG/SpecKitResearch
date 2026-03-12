import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type TestDb = {
  databaseUrl: string;
  cleanup: () => void;
};

function prismaBinPath(): string {
  const base = path.resolve(process.cwd(), 'node_modules/.bin/prisma');
  return process.platform === 'win32' ? `${base}.cmd` : base;
}

function runMigrations(databaseUrl: string): void {
  execFileSync(prismaBinPath(), ['migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe'
  });
}

export function setupTestDb(): TestDb {
  const tmpDir = path.resolve(process.cwd(), 'tests/.tmp');
  mkdirSync(tmpDir, { recursive: true });

  const dbFile = path.join(tmpDir, `test-${randomUUID()}.db`);
  const databaseUrl = `file:${dbFile}`;

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = databaseUrl;
  process.env.SESSION_COOKIE_SECURE = 'false';
  process.env.SESSION_COOKIE_SAMESITE = 'lax';

  runMigrations(databaseUrl);

  return {
    databaseUrl,
    cleanup: () => {
      try {
        rmSync(dbFile, { force: true });
      } catch {
        // ignore
      }
    }
  };
}
