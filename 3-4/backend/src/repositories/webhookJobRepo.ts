import { getPrisma } from '../lib/db.js';

export async function enqueueWebhookJob(input: {
  orderId: string;
  replayRunId?: string | null;
  webhookEndpointId: string | null;
  url: string;
  eventId: string;
  runAt: Date;
}) {
  const prisma = getPrisma();
  return prisma.webhookJob.create({
    data: {
      orderId: input.orderId,
      replayRunId: input.replayRunId ?? null,
      webhookEndpointId: input.webhookEndpointId,
      url: input.url,
      eventId: input.eventId,
      runAt: input.runAt,
      status: 'pending',
      attemptCount: 0,
    },
  });
}

export async function lockDueJobs(input: { now: Date; workerId: string; limit: number }) {
  const prisma = getPrisma();

  // SQLite: lock by updating rows that are due and unlocked.
  const due = await prisma.webhookJob.findMany({
    where: {
      status: 'pending',
      runAt: { lte: input.now },
      lockedAt: null,
    },
    orderBy: { runAt: 'asc' },
    take: input.limit,
  });

  const locked: typeof due = [];
  for (const job of due) {
    try {
      const updated = await prisma.webhookJob.update({
        where: { id: job.id },
        data: {
          lockedAt: new Date(),
          lockedBy: input.workerId,
          status: 'running',
        },
      });
      locked.push(updated);
    } catch {
      // ignore races
    }
  }

  return locked;
}

export async function markJobResult(input: {
  jobId: string;
  status: 'succeeded' | 'failed' | 'dead';
  lastError: string | null;
  attemptCount: number;
  runAt?: Date;
}) {
  const prisma = getPrisma();
  return prisma.webhookJob.update({
    where: { id: input.jobId },
    data: {
      status: input.status,
      lastError: input.lastError,
      attemptCount: input.attemptCount,
      lockedAt: null,
      lockedBy: null,
      runAt: input.runAt,
    },
  });
}
