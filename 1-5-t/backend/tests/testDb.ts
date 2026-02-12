import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function execFileAsync(file: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }) {
  return new Promise<void>((resolve, reject) => {
    execFile(file, args, opts, (err, _stdout, _stderr) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getPrismaBinPath(repoRoot: string) {
  const binName = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
  return path.join(repoRoot, 'node_modules', '.bin', binName);
}

export async function createTestDb() {
  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(testsDir, '..');
  const repoRoot = path.resolve(backendDir, '..');

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'doc-review-approval-'));
  const dbPath = path.join(tempDir, 'test.db');
  const databaseUrl = `file:${dbPath}`;

  const prismaBin = getPrismaBinPath(repoRoot);
  await execFileAsync(prismaBin, ['migrate', 'deploy'], {
    cwd: backendDir,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });

  return {
    databaseUrl,
    async cleanup() {
      const { prisma } = await import('../src/db/prisma.js');
      await prisma.$disconnect();
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}
