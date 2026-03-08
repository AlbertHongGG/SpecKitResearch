import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsageRecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByOrg(orgId: string) {
    return this.prisma.usageRecord.findMany({ where: { organizationId: orgId }, orderBy: { periodStart: 'desc' } });
  }

  async upsertUsage(input: {
    organizationId: string;
    subscriptionId: string;
    meterCode: string;
    periodStart: Date;
    periodEnd: Date;
    sourceEventId?: string;
    increment: number;
  }) {
    const current = await this.prisma.usageRecord.findFirst({
      where: {
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId,
        meterCode: input.meterCode,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });

    if (current) {
      return this.prisma.usageRecord.update({
        where: { id: current.id },
        data: { value: current.value + input.increment },
      });
    }

    return this.prisma.usageRecord.create({
      data: {
        organizationId: input.organizationId,
        subscriptionId: input.subscriptionId,
        meterCode: input.meterCode,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        value: input.increment,
        sourceEventId: input.sourceEventId,
      },
    });
  }
}
