import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/db/prisma.service';
import { telemetry } from '../logs/telemetry';

function bucketStart(date: Date, windowMs: number) {
  return new Date(Math.floor(date.getTime() / windowMs) * windowMs);
}

@Injectable()
export class RateLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async checkAndIncrement(keyId: string, limits: { minute: number; hour: number }) {
    telemetry.rateLimitChecksTotal++;
    const now = new Date();
    const minuteMs = 60_000;
    const hourMs = 3_600_000;
    const minuteBucket = bucketStart(now, minuteMs);
    const hourBucket = bucketStart(now, hourMs);

    try {
      const [minuteCounter, hourCounter] = await this.prisma.$transaction([
        this.prisma.rateLimitCounter.upsert({
          where: { keyId_window_bucketStart: { keyId, window: 'MINUTE', bucketStart: minuteBucket } },
          create: { keyId, window: 'MINUTE', bucketStart: minuteBucket, count: 1 },
          update: { count: { increment: 1 } },
        }),
        this.prisma.rateLimitCounter.upsert({
          where: { keyId_window_bucketStart: { keyId, window: 'HOUR', bucketStart: hourBucket } },
          create: { keyId, window: 'HOUR', bucketStart: hourBucket, count: 1 },
          update: { count: { increment: 1 } },
        }),
      ]);

      const minuteRemaining = Math.max(limits.minute - minuteCounter.count, 0);
      const hourRemaining = Math.max(limits.hour - hourCounter.count, 0);
      const allowed = minuteCounter.count <= limits.minute && hourCounter.count <= limits.hour;

      return {
        allowed,
        minute: {
          limit: limits.minute,
          remaining: minuteRemaining,
          resetMs: minuteBucket.getTime() + minuteMs - now.getTime(),
        },
        hour: {
          limit: limits.hour,
          remaining: hourRemaining,
          resetMs: hourBucket.getTime() + hourMs - now.getTime(),
        },
        degraded: false,
      };
    } catch (e: any) {
      telemetry.sqliteBusyTotal++;
      // Fail-open on transient SQLite contention
      return {
        allowed: true,
        minute: { limit: limits.minute, remaining: limits.minute, resetMs: 60_000 },
        hour: { limit: limits.hour, remaining: limits.hour, resetMs: 3_600_000 },
        degraded: true,
      };
    }
  }
}
