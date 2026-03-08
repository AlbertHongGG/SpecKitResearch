import type { FastifyBaseLogger } from 'fastify';
import { getPrisma } from '../lib/db.js';
import { cleanupExpiredSessions } from '../repositories/sessionRepo.js';

const DEFAULT_INTERVAL_MS = 60_000;
const STALE_WEBHOOK_JOB_LOCK_MS = 5 * 60_000;
const DEAD_WEBHOOK_JOB_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function startCleanupWorker(opts: { logger?: FastifyBaseLogger; intervalMs?: number }) {
  const logger = opts.logger;
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;

  let running = false;

  async function tick() {
    if (running) return;
    running = true;

    try {
      const prisma = getPrisma();
      const now = new Date();

      const sessions = await cleanupExpiredSessions();

      const staleCutoff = new Date(now.getTime() - STALE_WEBHOOK_JOB_LOCK_MS);
      const released = await prisma.webhookJob.updateMany({
        where: {
          status: 'running',
          lockedAt: { lt: staleCutoff },
        },
        data: {
          status: 'pending',
          lockedAt: null,
          lockedBy: null,
        },
      });

      const deadCutoff = new Date(now.getTime() - DEAD_WEBHOOK_JOB_TTL_MS);
      const deletedDead = await prisma.webhookJob.deleteMany({
        where: {
          status: 'dead',
          updatedAt: { lt: deadCutoff },
        },
      });

      if ((sessions.count ?? 0) > 0 || (released.count ?? 0) > 0 || (deletedDead.count ?? 0) > 0) {
        logger?.info(
          {
            sessionsDeleted: sessions.count,
            webhookJobsReleased: released.count,
            webhookJobsDeletedDead: deletedDead.count,
          },
          'cleanup worker tick'
        );
      }
    } catch (err) {
      logger?.error({ err }, 'cleanup worker tick failed');
    } finally {
      running = false;
    }
  }

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);

  logger?.info({ intervalMs }, 'cleanup worker started');

  return () => clearInterval(timer);
}
