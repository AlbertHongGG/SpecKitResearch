import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminRiskService {
  constructor(private readonly prisma: PrismaService) {}

  async listRiskAccounts() {
    const subs = await this.prisma.subscription.findMany({ include: { organization: true } });
    return subs
      .filter((s) => ['PastDue', 'Suspended'].includes(s.status) || (s.gracePeriodEndAt && s.gracePeriodEndAt > new Date()))
      .map((s) => ({
        organizationId: s.organizationId,
        organizationName: s.organization.name,
        status: s.status,
        gracePeriodEndAt: s.gracePeriodEndAt,
      }));
  }
}
