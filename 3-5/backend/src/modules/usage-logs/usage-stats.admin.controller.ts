import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { RequireAdminGuard } from '../../guards/require-admin.guard';
import { PrismaService } from '../../shared/db/prisma.service';

import { UsageStatsQueryDto } from './usage-logs.dto';
import { buildUsageEndpointFilter } from './usage-logs.repository';

@Controller('admin/usage-stats')
@UseGuards(RequireAdminGuard)
export class AdminUsageStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async stats(@Query() query: UsageStatsQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const where: any = {
      timestamp: { gte: from, lte: to },
      ...buildUsageEndpointFilter(query.endpoint),
    };

    const grouped = await this.prisma.apiUsageLog.groupBy({
      by: ['statusCode'],
      where,
      _count: { _all: true },
    });

    const countByStatus = new Map<number, number>();
    for (const row of grouped) {
      countByStatus.set(row.statusCode, row._count._all);
    }

    const unauthorized401 = countByStatus.get(401) ?? 0;
    const forbidden403 = countByStatus.get(403) ?? 0;
    const rateLimited429 = countByStatus.get(429) ?? 0;

    const serverError5xx = Array.from(countByStatus.entries())
      .filter(([code]) => code >= 500 && code <= 599)
      .reduce((sum, [, cnt]) => sum + cnt, 0);

    return {
      unauthorized_401_count: unauthorized401,
      forbidden_403_count: forbidden403,
      rate_limited_429_count: rateLimited429,
      server_error_5xx_count: serverError5xx,
    };
  }
}
