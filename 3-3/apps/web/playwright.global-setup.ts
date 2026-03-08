import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(cmd: string, opts: { cwd: string; env: NodeJS.ProcessEnv }) {
  execSync(cmd, {
    cwd: opts.cwd,
    env: opts.env,
    stdio: 'inherit',
  });
}

export default async function globalSetup() {
  const rootDir = path.resolve(process.cwd(), '../..');
  const dbFile = path.resolve(rootDir, 'tests/e2e/e2e.db');
  const dbUrl = `file:${dbFile}`;

  try {
    fs.rmSync(dbFile, { force: true });
    fs.rmSync(`${dbFile}-journal`, { force: true });
    fs.rmSync(`${dbFile}-wal`, { force: true });
    fs.rmSync(`${dbFile}-shm`, { force: true });
  } catch {
    // ignore
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    APP_ORIGIN: process.env.E2E_WEB_ORIGIN ?? 'http://localhost:3100',
    DATABASE_URL: dbUrl,
  };

  run('pnpm -C packages/db migrate:deploy', { cwd: rootDir, env });
  run('pnpm -C packages/db seed', { cwd: rootDir, env });
}
