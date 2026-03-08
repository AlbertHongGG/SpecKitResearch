import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const __dirname = new URL('.', import.meta.url).pathname;
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'openapi.yaml');
const outDir = path.join(root, 'src');
const out = path.join(outDir, 'openapi.ts');

mkdirSync(outDir, { recursive: true });

const stdout = execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'openapi-typescript', 'bin', 'cli.js'),
    input,
    '--output',
    out,
  ],
  { encoding: 'utf8' },
);

// openapi-typescript writes directly to file; keep stdout just in case
if (stdout?.trim()) {
  writeFileSync(path.join(root, '.generate.log'), stdout);
}

console.log(`Generated: ${path.relative(process.cwd(), out)}`);
