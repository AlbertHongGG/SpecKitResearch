import type { PrismaClient } from '@prisma/client';

export async function runCleanupWorkerLoop(params: {
  prisma: PrismaClient;
  pollIntervalMs?: number;
  sessionGraceMs?: number;
  webhookJobGraceMs?: number;
  stopSignal?: { stopped: boolean };
}) {
  const pollIntervalMs = params.pollIntervalMs ?? 60_000;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (params.stopSignal?.stopped) return;
    await runCleanupWorkerOnce({
      prisma: params.prisma,
      now: new Date(),
      sessionGraceMs: params.sessionGraceMs,
      webhookJobGraceMs: params.webhookJobGraceMs,
    });
    await sleep(pollIntervalMs);
  }
}

export async function runCleanupWorkerOnce(params: {
  prisma: PrismaClient;
  now: Date;
  sessionGraceMs?: number;
  webhookJobGraceMs?: number;
}) {
  const sessionGraceMs = params.sessionGraceMs ?? 24 * 60 * 60 * 1000;
  const webhookJobGraceMs = params.webhookJobGraceMs ?? 7 * 24 * 60 * 60 * 1000;

  const sessionCutoff = new Date(params.now.getTime() - sessionGraceMs);
  const webhookJobCutoff = new Date(params.now.getTime() - webhookJobGraceMs);

  const [requeuedStuckJobs, deletedOldJobs, deletedOldSessions] = await Promise.all([
    params.prisma.webhookJob.updateMany({
      where: {
        status: 'processing',
        lock_expires_at: { lt: params.now },
      },
      data: {
        status: 'queued',
        run_at: params.now,
        lock_expires_at: null,
      },
    }),
    params.prisma.webhookJob.deleteMany({
      where: {
        status: { in: ['succeeded', 'dead'] },
        updated_at: { lt: webhookJobCutoff },
      },
    }),
    params.prisma.session.deleteMany({
      where: {
        OR: [{ expires_at: { lt: sessionCutoff } }, { revoked_at: { lt: sessionCutoff } }],
      },
    }),
  ]);

  return {
    requeuedStuckJobs: requeuedStuckJobs.count,
    deletedOldJobs: deletedOldJobs.count,
    deletedOldSessions: deletedOldSessions.count,
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
