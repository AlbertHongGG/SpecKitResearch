import { execFile } from 'node:child_process';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function execFileAsync(file: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv }) {
  return new Promise<void>((resolve, reject) => {
    execFile(file, args, opts, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default async function globalSetup() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const frontendDir = path.resolve(here, '../..');
  const repoRoot = path.resolve(frontendDir, '..');
  const backendDir = path.resolve(repoRoot, 'backend');

  const e2eDbPath = path.resolve(backendDir, 'prisma', 'e2e.db');
  try {
    await access(e2eDbPath);
    await rm(e2eDbPath, { force: true });
  } catch {
    // ignore
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: 'file:./prisma/e2e.db',
  };

  // Apply migrations.
  await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], { cwd: backendDir, env });

  // Seed predictable users + default template.
  await execFileAsync('npm', ['run', 'db:seed'], { cwd: backendDir, env });
}
