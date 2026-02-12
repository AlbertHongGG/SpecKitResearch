import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'file:./prisma/test.db';
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me-please';
process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5173';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDbPath = path.resolve(backendRoot, 'prisma', 'test.db');

// Ensure a clean SQLite file for each test run.
try {
  fs.rmSync(testDbPath, { force: true });
} catch {
  // ignore
}

// Apply migrations to the SQLite test database.
const prismaBin = path.resolve(backendRoot, 'node_modules', '.bin', 'prisma');
execFileSync(
  prismaBin,
  ['migrate', 'deploy', '--schema', path.resolve(backendRoot, 'prisma', 'schema.prisma')],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  },
);
