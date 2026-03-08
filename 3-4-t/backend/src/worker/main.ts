import { PrismaClient } from '@prisma/client';
import { loadEnv } from '../config/env';
import { runCleanupWorkerLoop } from './cleanup_worker';
import { runWebhookWorkerLoop } from './webhook_worker';

const env = loadEnv(process.env);
const prisma = new PrismaClient({
  datasources: {
    db: { url: env.DATABASE_URL },
  },
});

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = (args.mode ?? args.worker ?? 'webhook') as string;

  if (mode === 'cleanup') {
    await runCleanupWorkerLoop({
      prisma,
      pollIntervalMs: args.pollIntervalMs,
      sessionGraceMs: args.sessionGraceMs,
      webhookJobGraceMs: args.webhookJobGraceMs,
    });
    return;
  }

  if (mode === 'all') {
    await Promise.all([
      runWebhookWorkerLoop({
        prisma,
        envSigningSecret: env.WEBHOOK_SIGNING_SECRET,
        pollIntervalMs: args.webhookPollIntervalMs,
        lockTtlSec: args.webhookLockTtlSec,
      }),
      runCleanupWorkerLoop({
        prisma,
        pollIntervalMs: args.pollIntervalMs,
        sessionGraceMs: args.sessionGraceMs,
        webhookJobGraceMs: args.webhookJobGraceMs,
      }),
    ]);
    return;
  }

  await runWebhookWorkerLoop({
    prisma,
    envSigningSecret: env.WEBHOOK_SIGNING_SECRET,
    pollIntervalMs: args.webhookPollIntervalMs,
    lockTtlSec: args.webhookLockTtlSec,
  });
}

function parseArgs(argv: string[]) {
  const out: Record<string, string | number | boolean> = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const token = raw.slice(2);
    const [kMaybe, vMaybe] = token.includes('=') ? token.split('=', 2) : [token, 'true'];
    const k = kMaybe ?? '';
    const v = vMaybe ?? 'true';
    if (!k) continue;
    if (k.endsWith('Ms') || k.endsWith('Sec')) {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
      continue;
    }
    out[k] = v;
  }
  return {
    mode: typeof out.mode === 'string' ? out.mode : undefined,
    worker: typeof out.worker === 'string' ? out.worker : undefined,
    pollIntervalMs: typeof out.pollIntervalMs === 'number' ? out.pollIntervalMs : undefined,
    sessionGraceMs: typeof out.sessionGraceMs === 'number' ? out.sessionGraceMs : undefined,
    webhookJobGraceMs: typeof out.webhookJobGraceMs === 'number' ? out.webhookJobGraceMs : undefined,
    webhookPollIntervalMs: typeof out.webhookPollIntervalMs === 'number' ? out.webhookPollIntervalMs : undefined,
    webhookLockTtlSec: typeof out.webhookLockTtlSec === 'number' ? out.webhookLockTtlSec : undefined,
  };
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
