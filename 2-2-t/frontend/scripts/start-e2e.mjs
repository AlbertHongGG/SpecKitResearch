import { spawn } from 'node:child_process';
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
  const env = {
    ...process.env,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
    NODE_ENV: 'test',
  };

  await runOrThrow(pnpmCmd, ['build'], { env });

  const nextBin = path.resolve(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = spawn(process.execPath, [nextBin, 'start', '-p', '3100'], {
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
