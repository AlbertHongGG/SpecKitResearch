import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class UsageRankingService {
  constructor(private readonly prisma: PrismaService) {}

  async rank(meterCode?: string) {
    const rows = await this.prisma.usageRecord.findMany({
      where: meterCode ? { meterCode } : undefined,
      include: { organization: true },
    });

    const totals = new Map<string, { organizationId: string; organizationName: string; value: number }>();
    rows.forEach((r) => {
      const current = totals.get(r.organizationId) || {
        organizationId: r.organizationId,
        organizationName: r.organization.name,
        value: 0,
      };
      current.value += r.value;
      totals.set(r.organizationId, current);
    });

    return [...totals.values()].sort((a, b) => b.value - a.value).slice(0, 50);
  }
}
