import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function createTestDatabaseUrl() {
  const dir = mkdtempSync(join(tmpdir(), 'pfs-tests-'));
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, 'test.db');
  return { dir, url: `file:${dbPath}` };
}

export function migrateTestDatabase(params: { cwd: string; databaseUrl: string }) {
  execFileSync(
    'npx',
    ['prisma', 'migrate', 'deploy'],
    {
      cwd: params.cwd,
      env: {
        ...process.env,
        DATABASE_URL: params.databaseUrl,
      },
      stdio: 'inherit',
    },
  );
}
