import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runOrThrow(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  const backendDir = process.cwd();
  const repoRoot = path.resolve(backendDir, '..');
  const varDir = path.join(repoRoot, 'var', 'e2e');
  const uploadsDir = path.join(varDir, 'uploads');
  const dbFile = path.join(varDir, 'e2e.db');

  fs.mkdirSync(uploadsDir, { recursive: true });
  try {
    fs.rmSync(dbFile, { force: true });
  } catch {
    // ignore
  }

  const env = {
    ...process.env,
    PORT: '3001',
    DATABASE_URL: 'file:../var/e2e/e2e.db',
    UPLOADS_DIR: '../var/e2e/uploads',
    CORS_ORIGIN: 'http://localhost:3100',
    SESSION_COOKIE_NAME: 'sid',
    SESSION_COOKIE_SECURE: 'false',
    NODE_ENV: 'test',
  };

  await runOrThrow(pnpmCmd, ['prisma', 'migrate', 'deploy'], { env });
  await runOrThrow(pnpmCmd, ['prisma', 'db', 'seed'], { env });

  const server = spawn(process.execPath, ['dist/main.js'], {
    stdio: 'inherit',
    env,
  });

  const forwardSignal = (signal) => {
    if (!server.killed) server.kill(signal);
  };

  process.on('SIGINT', forwardSignal);
  process.on('SIGTERM', forwardSignal);

  server.on('exit', (code) => {
    process.exitCode = code ?? 0;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
