import { Injectable } from '@nestjs/common';
import type { BillingCycle } from '@sb/db';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPlans(input?: { billingCycle?: BillingCycle }) {
    return this.prisma.plan.findMany({
      where: {
        isActive: true,
        ...(input?.billingCycle ? { billingCycle: input.billingCycle } : {}),
      },
      orderBy: [{ priceCents: 'asc' }, { name: 'asc' }],
    });
  }
}
