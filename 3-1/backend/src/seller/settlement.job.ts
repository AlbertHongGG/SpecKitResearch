import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';
import { SettlementService } from './settlement.service';

@Injectable()
export class SettlementJob {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlements: SettlementService,
  ) {}

  async runForPeriod(period: string) {
    const sellers = await this.prisma.user.findMany({
      where: {
        roles: { not: '[]' },
      },
      select: { id: true, roles: true },
    });

    for (const u of sellers) {
      const roles = (u.roles as any[]) ?? [];
      if (!roles.includes('seller')) continue;
      await this.settlements.computeAndUpsertPeriod({ sellerId: u.id, period });
    }
  }
}
