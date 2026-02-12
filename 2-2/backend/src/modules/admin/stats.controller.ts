import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../repositories/prisma.service.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('admin/stats')
@Roles('admin')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async stats() {
    const courseCounts = await this.prisma.course.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const purchaseCount = await this.prisma.purchase.count();
    const userCount = await this.prisma.user.count();
    const counts: Record<string, number> = {};
    for (const entry of courseCounts) {
      counts[entry.status] = entry._count._all;
    }
    return { courseCounts: counts, purchaseCount, userCount };
  }
}
