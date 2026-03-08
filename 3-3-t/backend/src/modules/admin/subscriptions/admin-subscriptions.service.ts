import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(q?: { status?: string; organizationId?: string }) {
    return this.prisma.subscription.findMany({
      where: {
        status: q?.status as any,
        organizationId: q?.organizationId,
      },
      include: { plan: true, invoices: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }
}
