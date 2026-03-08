import { Injectable } from '@nestjs/common';
import { assertOccUpdated } from '../../common/db/occ';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class SubscriptionsRepo {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentForOrg(orgId: string) {
    return this.prisma.subscription.findFirst({
      where: { organizationId: orgId, isCurrent: true },
    });
  }

  async getCurrentForOrgWithPlan(orgId: string) {
    return this.prisma.subscription.findFirst({
      where: { organizationId: orgId, isCurrent: true },
      include: { plan: true, pendingPlan: true },
    });
  }

  async updateWithOcc(id: string, version: number, data: Parameters<PrismaService['subscription']['update']>[0]['data']) {
    const result = await this.prisma.subscription.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    assertOccUpdated(result);
  }
}
