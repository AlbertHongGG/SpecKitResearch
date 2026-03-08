import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--featureDir') {
      args.featureDir = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const featureDir = args.featureDir ?? process.env.FEATURE_DIR ?? 'specs/001-api-platform-keys';

const src = resolve(featureDir, 'contracts', 'openapi.yaml');
const dest = resolve('contracts', 'openapi.yaml');

if (!existsSync(src)) {
  process.stderr.write(`Missing source contract: ${src}\n`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);

const size = statSync(dest).size;
if (size <= 0) {
  process.stderr.write(`Synced contract is empty: ${dest}\n`);
  process.exit(1);
}

process.stdout.write(`Synced OpenAPI contract to ${dest} (bytes=${size})\n`);
