import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getCurrentByOrg(organizationId: string) {
    return this.prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true, pendingPlan: true },
    });
  }

  updateById(id: string, data: any) {
    return this.prisma.subscription.update({ where: { id }, data, include: { plan: true, pendingPlan: true } });
  }

  create(data: any) {
    return this.prisma.subscription.create({ data });
  }
}
