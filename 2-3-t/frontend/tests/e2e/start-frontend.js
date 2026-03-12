/* eslint-disable no-console */

const { spawn } = require('child_process');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port ?? 3100);
const backend = args.backend ?? 'http://localhost:3101';

const frontendDir = path.resolve(__dirname, '../..');

const env = {
  ...process.env,
  NEXT_PUBLIC_BACKEND_URL: backend,
};

console.log(`[e2e-frontend] starting on port ${port} (backend=${backend})`);

const child = spawn('pnpm', ['-C', frontendDir, 'exec', 'next', 'dev', '-p', String(port)], {
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
