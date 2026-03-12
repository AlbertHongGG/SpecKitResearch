import { PrismaService } from '../../common/db/prisma.service';

// Best-effort cleanup for old buckets
export async function cleanupRateLimitCounters(
  prisma: PrismaService,
  params?: {
    minuteRetentionHours?: number;
    hourRetentionDays?: number;
  },
) {
  const minuteRetentionHours = params?.minuteRetentionHours ?? 6;
  const hourRetentionDays = params?.hourRetentionDays ?? 7;

  const minuteCutoff = new Date(Date.now() - minuteRetentionHours * 60 * 60 * 1000);
  const hourCutoff = new Date(Date.now() - hourRetentionDays * 24 * 60 * 60 * 1000);

  await prisma.rateLimitCounter.deleteMany({ where: { window: 'MINUTE', bucketStart: { lt: minuteCutoff } } });
  await prisma.rateLimitCounter.deleteMany({ where: { window: 'HOUR', bucketStart: { lt: hourCutoff } } });
}
