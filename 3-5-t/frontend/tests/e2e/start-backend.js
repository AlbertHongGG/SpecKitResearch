/* eslint-disable no-console */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function runOrThrow(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port ?? 3101);
const dbRel = args.db ?? '../data/e2e.db';
const upstream = args.upstream ?? 'http://localhost:4000';

const repoRoot = path.resolve(__dirname, '../../..');
const backendDir = path.join(repoRoot, 'backend');

const dbAbs = path.resolve(backendDir, dbRel);
fs.mkdirSync(path.dirname(dbAbs), { recursive: true });
try {
  fs.unlinkSync(dbAbs);
} catch {
  // ignore if missing
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  PORT: String(port),
  DATABASE_URL: `file:${dbAbs}`,
  API_KEY_PEPPER: process.env.E2E_API_KEY_PEPPER ?? 'e2e-pepper-please-change',
  UPSTREAM_ALLOWLIST_HOSTS: 'localhost,127.0.0.1',
};

// Migrate + seed before starting the server.
runOrThrow('pnpm', ['-C', backendDir, 'prisma', 'migrate', 'deploy'], { env });
runOrThrow('pnpm', ['-C', backendDir, 'seed'], { env });

// IMPORTANT: Run compiled output so NestJS decorator metadata is emitted.
// (tsx/esbuild does not emit emitDecoratorMetadata; DI breaks in runtime mode.)
runOrThrow('pnpm', ['-C', backendDir, 'build'], { env });

console.log(`[e2e-backend] starting on port ${port} (db=${dbAbs}, upstreamSeed=${upstream})`);

const child = spawn('pnpm', ['-C', backendDir, 'start'], {
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
