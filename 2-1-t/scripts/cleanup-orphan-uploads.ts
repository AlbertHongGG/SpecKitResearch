import { cleanupOrphanUploads } from '../src/server/files/compensation';

function getFlag(name: string) {
  return process.argv.includes(name);
}

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const dryRun = getFlag('--dry-run');
  const olderHoursRaw = getArg('--older-than-hours');
  const olderThanMs = olderHoursRaw ? Number(olderHoursRaw) * 60 * 60 * 1000 : undefined;

  const res = await cleanupOrphanUploads({ dryRun, olderThanMs });
  console.log(JSON.stringify({ dryRun, olderThanMs, ...res }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
