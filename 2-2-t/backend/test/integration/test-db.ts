import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '../../src/generated/prisma/client';

export async function createTestDb() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smartbooking-test-'));
  const dbPath = path.join(tempDir, 'test.db');

  const migrationSqlPath = path.resolve(
    process.cwd(),
    'prisma',
    'migrations',
    '20260303192308_init',
    'migration.sql',
  );
  const migrationSql = fs.readFileSync(migrationSqlPath, 'utf-8');

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.exec(migrationSql);
  db.close();

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  return {
    prisma,
    async cleanup() {
      await prisma.$disconnect();
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}
