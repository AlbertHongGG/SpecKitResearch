import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

export type TestDb = {
  tmpDir: string;
  dbUrl: string;
  uploadsDir: string;
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
};

function backendRootDir() {
  return path.resolve(__dirname, '../..');
}

export function migrateDeploy(dbUrl: string) {
  execSync('pnpm prisma migrate deploy', {
    cwd: backendRootDir(),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
  });
}

export async function createTestDb(): Promise<TestDb> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccp-backend-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const dbUrl = `file:${dbPath}`;
  const uploadsDir = path.join(tmpDir, 'uploads');

  process.env.DATABASE_URL = dbUrl;
  process.env.SESSION_COOKIE_NAME = '__Host-sid';
  process.env.SESSION_TTL_SECONDS = '1209600';
  process.env.PORT = '3001';
  process.env.UPLOADS_DIR = uploadsDir;

  migrateDeploy(dbUrl);

  const prisma = new PrismaClient();

  return {
    tmpDir,
    dbUrl,
    uploadsDir,
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    },
  };
}
