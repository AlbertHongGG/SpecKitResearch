import type { Prisma, PrismaClient, WebhookJob } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export class WebhookJobService {
  constructor(private prisma: DbClient) {}

  async enqueue(params: {
    orderId: string;
    replayRunId?: string | null;
    runAt: Date;
    maxAttempts?: number;
  }) {
    return this.prisma.webhookJob.create({
      data: {
        order_id: params.orderId,
        replay_run_id: params.replayRunId ?? null,
        run_at: params.runAt,
        status: 'queued',
        max_attempts: params.maxAttempts ?? 8,
      },
    });
  }

  async claimNext(params: {
    now: Date;
    lockTtlSec: number;
  }): Promise<WebhookJob | null> {
    const candidate = await this.prisma.webhookJob.findFirst({
      where: {
        status: 'queued',
        run_at: { lte: params.now },
        OR: [{ lock_expires_at: null }, { lock_expires_at: { lt: params.now } }],
      },
      orderBy: { run_at: 'asc' },
    });
    if (!candidate) return null;

    const updated = await this.prisma.webhookJob.updateMany({
      where: {
        id: candidate.id,
        status: 'queued',
        OR: [{ lock_expires_at: null }, { lock_expires_at: { lt: params.now } }],
      },
      data: {
        status: 'processing',
        attempt_count: { increment: 1 },
        lock_expires_at: new Date(params.now.getTime() + params.lockTtlSec * 1000),
      },
    });
    if (updated.count !== 1) return null;

    return this.prisma.webhookJob.findUnique({ where: { id: candidate.id } });
  }

  async complete(params: { id: string; now: Date }) {
    return this.prisma.webhookJob.update({
      where: { id: params.id },
      data: { status: 'succeeded', lock_expires_at: null },
    });
  }

  async fail(params: { id: string; now: Date; error: string }) {
    const job = await this.prisma.webhookJob.findUnique({ where: { id: params.id } });
    if (!job) return null;
    const attemptsLeft = job.attempt_count < job.max_attempts;

    if (!attemptsLeft) {
      return this.prisma.webhookJob.update({
        where: { id: params.id },
        data: { status: 'dead', last_error: params.error, lock_expires_at: null },
      });
    }

    const delayMs = computeBackoffMs(job.attempt_count);
    return this.prisma.webhookJob.update({
      where: { id: params.id },
      data: {
        status: 'queued',
        run_at: new Date(params.now.getTime() + delayMs),
        last_error: params.error,
        lock_expires_at: null,
      },
    });
  }
}

function computeBackoffMs(attemptCount: number) {
  const base = 2_000;
  const max = 60_000;
  const exp = Math.min(6, Math.max(0, attemptCount - 1));
  return Math.min(max, base * 2 ** exp);
}
