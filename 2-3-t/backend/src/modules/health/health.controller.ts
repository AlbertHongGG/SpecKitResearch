import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '../../common/db/prisma.service';
import { AuditWriter } from '../logs/audit.writer';
import { telemetry } from '../logs/telemetry';
import { UsageWriter } from '../logs/usage.writer';

@Controller('/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usageWriter: UsageWriter,
    private readonly auditWriter: AuditWriter,
  ) {}

  @Get()
  async health() {
    // Best-effort DB check
    let dbOk = true;
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch {
      dbOk = false;
    }
    const sqliteBusyRatio = telemetry.rateLimitChecksTotal
      ? telemetry.sqliteBusyTotal / telemetry.rateLimitChecksTotal
      : 0;

    return {
      ok: dbOk,
      db: { ok: dbOk },
      writers: {
        usage: this.usageWriter.getStatus(),
        audit: this.auditWriter.getStatus(),
      },
      telemetry: {
        ...telemetry,
        sqliteBusyRatio,
      },
    };
  }
}
