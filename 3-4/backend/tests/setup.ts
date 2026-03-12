import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { threadId } from 'node:worker_threads';

import { PrismaClient, Role, SimulationScenario, ReturnMethod } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findMigrationSqlPath(): string {
  const migrationsDir = path.resolve(__dirname, '../prisma/migrations');
  // Expect exactly one init migration in this repo; pick the first migration.sql.
  return path.join(migrationsDir, '20260305052315_init', 'migration.sql');
}

async function ensureTestDb(): Promise<string> {
  const baseDir = path.join(os.tmpdir(), 'paysim-vitest');
  await fs.mkdir(baseDir, { recursive: true });

  const dbPath = path.join(baseDir, `test-${process.pid}-${threadId}.db`);
  await fs.rm(dbPath, { force: true });

  const migrationSql = findMigrationSqlPath();

  // Apply migration via sqlite3 CLI.
  execFileSync('sqlite3', [dbPath, `.read ${migrationSql}`], { stdio: 'ignore' });

  return dbPath;
}

async function seed(prisma: PrismaClient): Promise<void> {
  const adminEmail = 'admin@example.com';
  const userEmail = 'user@example.com';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await hashPassword('admin1234'),
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      passwordHash: await hashPassword('user1234'),
      role: Role.USER,
    },
  });

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      allowedCurrencies: ['TWD', 'USD', 'JPY'],
      defaultReturnMethod: ReturnMethod.query_string,
      sessionIdleSec: 60 * 60 * 8,
      sessionAbsoluteSec: 60 * 60 * 24 * 7,
      webhookSecretGraceSecDefault: 60 * 60 * 24 * 7,
    },
  });

  await prisma.paymentMethod.upsert({
    where: { code: 'CREDIT_CARD_SIM' },
    update: { enabled: true, displayName: '信用卡（模擬）', sortOrder: 1 },
    create: { code: 'CREDIT_CARD_SIM', enabled: true, displayName: '信用卡（模擬）', sortOrder: 1 },
  });

  const scenarios: Array<{ scenario: SimulationScenario; enabled: boolean; delay: number; errorCode?: string; errorMessage?: string }> = [
    { scenario: SimulationScenario.success, enabled: true, delay: 0 },
    { scenario: SimulationScenario.failed, enabled: true, delay: 0, errorCode: 'CARD_DECLINED', errorMessage: '卡片被拒' },
    { scenario: SimulationScenario.cancelled, enabled: true, delay: 0 },
    { scenario: SimulationScenario.timeout, enabled: true, delay: 0, errorCode: 'TIMEOUT', errorMessage: '逾時' },
    { scenario: SimulationScenario.delayed_success, enabled: true, delay: 5 },
  ];

  for (const s of scenarios) {
    await prisma.simulationScenarioTemplate.upsert({
      where: { scenario: s.scenario },
      update: {
        enabled: s.enabled,
        defaultDelaySec: s.delay,
        defaultErrorCode: s.errorCode ?? null,
        defaultErrorMessage: s.errorMessage ?? null,
      },
      create: {
        scenario: s.scenario,
        enabled: s.enabled,
        defaultDelaySec: s.delay,
        defaultErrorCode: s.errorCode ?? null,
        defaultErrorMessage: s.errorMessage ?? null,
      },
    });
  }

  // Keep lint happy.
  void admin;
}

// Global vitest setup: provide a working DATABASE_URL + seeded DB.
const dbPath = await ensureTestDb();
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.RUN_WEBHOOK_WORKER = 'false';
process.env.COOKIE_SECURE = 'false';
process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:5174';
process.env.SESSION_COOKIE_NAME = 'paysim_session';
process.env.CSRF_COOKIE_NAME = 'csrf_token';
process.env.SECRET_ENCRYPTION_KEY_BASE64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

const prisma = new PrismaClient();
await seed(prisma);
await prisma.$disconnect();
