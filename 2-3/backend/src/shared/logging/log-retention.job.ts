import type { PrismaService } from '../db/prisma.service';

export type LogRetentionJobHandle = {
  stop: () => void;
};

export function startLogRetentionJob(prisma: PrismaService, opts?: { days?: number }): LogRetentionJobHandle {
  const days = opts?.days ?? 90;

  async function runOnce() {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await prisma.apiUsageLog.deleteMany({ where: { timestamp: { lt: cutoff } } });
    await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  }

  // Fire-and-forget (do not crash the process on failures)
  runOnce().catch(() => undefined);

  const interval = setInterval(() => {
    runOnce().catch(() => undefined);
  }, 24 * 60 * 60 * 1000);

  return {
    stop: () => clearInterval(interval),
  };
}
