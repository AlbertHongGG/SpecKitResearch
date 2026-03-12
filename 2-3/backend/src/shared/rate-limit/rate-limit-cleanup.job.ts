import type { PrismaService } from '../db/prisma.service';

export type RateLimitCleanupJobHandle = {
  stop: () => void;
};

export function startRateLimitCleanupJob(
  prisma: PrismaService,
  opts?: {
    olderThanHours?: number;
    intervalMinutes?: number;
  },
): RateLimitCleanupJobHandle {
  const olderThanHours = opts?.olderThanHours ?? 48;
  const intervalMinutes = opts?.intervalMinutes ?? 60;

  async function runOnce() {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    await prisma.rateLimitBucket.deleteMany({ where: { startTs: { lt: cutoff } } });
  }

  runOnce().catch(() => undefined);

  const interval = setInterval(() => {
    runOnce().catch(() => undefined);
  }, intervalMinutes * 60 * 1000);

  return {
    stop: () => clearInterval(interval),
  };
}
