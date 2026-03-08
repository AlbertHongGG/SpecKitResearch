import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/db/prisma.service';
import { getConfig } from '../../common/config/config';
import type { UsageEvent } from './usage.events';
import { telemetry } from './telemetry';

@Injectable()
export class UsageWriter implements OnModuleInit, OnModuleDestroy {
  private queue: UsageEvent[] = [];
  private oldestEnqueueAtMs?: number;
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const config = getConfig(process.env);
    this.timer = setInterval(() => void this.flush(), config.logFlushIntervalMs).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  enqueue(event: UsageEvent) {
    const config = getConfig(process.env);
    if (this.queue.length >= config.usageQueueMax) {
      telemetry.usageDroppedTotal++;
      return false;
    }
    if (this.queue.length === 0) {
      this.oldestEnqueueAtMs = Date.now();
    }
    this.queue.push(event);
    return true;
  }

  getStatus() {
    return {
      queueLength: this.queue.length,
      queueAgeMs: this.oldestEnqueueAtMs ? Date.now() - this.oldestEnqueueAtMs : 0,
    };
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, 500);
    try {
      await this.prisma.usageLog.createMany({
        data: batch.map((e) => ({
          requestId: e.requestId,
          keyId: e.keyId,
          userId: e.userId,
          serviceSlug: e.serviceSlug,
          endpointId: e.endpointId,
          method: e.method,
          path: e.path,
          statusCode: e.statusCode,
          durationMs: e.durationMs,
          outcome: e.outcome,
          errorCode: e.errorCode,
        })),
      });
    } catch {
      // drop on failure
      telemetry.usageDroppedTotal += batch.length;
    }

    if (this.queue.length === 0) {
      this.oldestEnqueueAtMs = undefined;
    }
  }
}
