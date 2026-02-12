import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/db/prisma.service';

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaService) {}

  async listMySettlements(sellerId: string) {
    return this.prisma.settlement.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getMySettlement(sellerId: string, settlementId: string) {
    return this.prisma.settlement.findFirst({
      where: { id: settlementId, sellerId },
    });
  }

  async computeAndUpsertPeriod(params: { sellerId: string; period: string }) {
    const subOrders = await this.prisma.subOrder.findMany({
      where: {
        sellerId: params.sellerId,
        status: { in: ['paid', 'shipped', 'delivered'] },
      },
      select: { subtotal: true },
    });

    const gross = subOrders.reduce((sum, s) => sum + s.subtotal, 0);
    const platformFee = Math.floor(gross * 0.1);
    const net = gross - platformFee;

    return this.prisma.settlement.upsert({
      where: { sellerId_period: { sellerId: params.sellerId, period: params.period } },
      update: {
        grossAmount: gross,
        platformFee,
        netAmount: net,
      },
      create: {
        sellerId: params.sellerId,
        period: params.period,
        grossAmount: gross,
        platformFee,
        netAmount: net,
        status: 'pending',
      },
    });
  }
}
