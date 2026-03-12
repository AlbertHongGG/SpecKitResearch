/* eslint-disable no-console */

const { spawn, spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');

function runOrThrow(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function spawnChild(command, args, options) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`[dev] ${command} exited with code ${code}`);
    }
  });
  return child;
}

function killChild(child) {
  if (!child || child.killed) return;
  try {
    child.kill('SIGTERM');
  } catch {
    // ignore
  }
}

async function main() {
  // IMPORTANT: NestJS DI needs decorator metadata.
  // Running TS directly via tsx/esbuild does not emit it, so we always run compiled output.
  runOrThrow('pnpm', ['run', 'build'], { cwd: backendDir });

  console.log('[dev] starting TypeScript build watcher');
  const tsc = spawnChild('pnpm', ['run', 'build:watch'], { cwd: backendDir });

  console.log('[dev] starting Node (watch) on dist/main.js');
  const node = spawnChild('node', ['--watch', 'dist/main.js'], { cwd: backendDir });

  const shutdown = () => {
    killChild(node);
    killChild(tsc);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  node.on('exit', (code) => {
    shutdown();
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
