import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/db/prisma.service';
import { getConfig } from '../../common/config/config';
import type { AuditEvent } from './audit.events';
import { telemetry } from './telemetry';

@Injectable()
export class AuditWriter implements OnModuleInit, OnModuleDestroy {
  private queue: AuditEvent[] = [];
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

  enqueue(event: AuditEvent) {
    const config = getConfig(process.env);
    if (this.queue.length >= config.auditQueueMax) {
      telemetry.auditDroppedTotal++;
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
    const batch = this.queue.splice(0, 300);
    try {
      await this.prisma.auditLog.createMany({
        data: batch.map((e) => ({
          eventId: e.eventId,
          requestId: e.requestId,
          actorUserId: e.actorUserId,
          actorRole: e.actorRole,
          action: e.action,
          targetType: e.targetType,
          targetId: e.targetId,
          success: e.success,
          metadata: e.metadata,
        })),
      });
    } catch {
      telemetry.auditDroppedTotal += batch.length;
    }

    if (this.queue.length === 0) {
      this.oldestEnqueueAtMs = undefined;
    }
  }
}
