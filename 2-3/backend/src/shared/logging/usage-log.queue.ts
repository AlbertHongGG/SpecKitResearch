import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { PrismaService } from '../db/prisma.service';
import { logger } from '../observability/logger';

export type UsageLogItem = {
  apiKeyId: string;
  endpointId?: string;
  httpMethod: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  requestId?: string;
  timestamp: Date;
};

@Injectable()
export class UsageLogQueue {
  private readonly maxQueueSize = 10_000;
  private readonly batchSize = 250;

  private queue: UsageLogItem[] = [];
  private flushing = false;
  private dropped = 0;

  constructor(private readonly prisma: PrismaService) {}

  enqueue(item: UsageLogItem): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.dropped += 1;
      return;
    }

    this.queue.push(item);

    if (!this.flushing) {
      void this.flushLoop();
    }
  }

  getStats(): { queued: number; dropped: number } {
    return { queued: this.queue.length, dropped: this.dropped };
  }

  private async flushLoop(): Promise<void> {
    this.flushing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);

        await this.prisma.apiUsageLog.createMany({
          data: batch.map((b) => ({
            id: randomUUID(),
            apiKeyId: b.apiKeyId,
            endpointId: b.endpointId ?? null,
            httpMethod: b.httpMethod,
            path: b.path,
            statusCode: b.statusCode,
            responseTimeMs: b.responseTimeMs,
            requestId: b.requestId ?? null,
            timestamp: b.timestamp
          }))
        });
      }
    } catch (err) {
      logger.error('usage_log_flush_failed', { error: String(err) });
    } finally {
      this.flushing = false;
    }
  }
}
