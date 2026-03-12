import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function backendRoot() {
  return path.resolve(__dirname, '../..');
}

export function createIsolatedDatabaseUrl(prefix: string) {
  const dir = mkdtempSync(path.join(tmpdir(), `api-key-platform-${prefix}-`));
  const filePath = path.join(dir, 'test.db');
  return { dir, databaseUrl: `file:${filePath}` };
}

export function migrateDatabase(databaseUrl: string) {
  const prismaBin = path.join(backendRoot(), 'node_modules', '.bin', 'prisma');
  execFileSync(prismaBin, ['migrate', 'deploy'], {
    cwd: backendRoot(),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      API_KEY_PEPPER: 'test-pepper-0123456789',
      SESSION_COOKIE_NAME: 'sid',
    },
  });
}
