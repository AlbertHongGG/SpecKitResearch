import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { getConfig } from '../../common/config/config';
import { PrismaService } from '../../common/db/prisma.service';
import { cleanupRateLimitCounters } from './rate-limit.cleanup';

@Injectable()
export class RateLimitCleanupService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const config = getConfig(process.env);
    this.timer = setInterval(() => {
      void cleanupRateLimitCounters(this.prisma, {
        minuteRetentionHours: config.rateLimitCounterRetentionMinuteHours,
        hourRetentionDays: config.rateLimitCounterRetentionHourDays,
      });
    }, config.rateLimitCleanupIntervalMs).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
