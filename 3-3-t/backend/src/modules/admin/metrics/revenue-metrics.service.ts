import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class RevenueMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const paidInvoices = await this.prisma.invoice.findMany({ where: { status: 'Paid' } });
    const mrr = paidInvoices.reduce((sum, i) => sum + i.totalCents, 0);
    const canceled = await this.prisma.subscription.count({ where: { status: 'Canceled' } });
    const total = await this.prisma.subscription.count();
    const churn = total === 0 ? 0 : canceled / total;

    return {
      mrrCents: mrr,
      churnRate: Number(churn.toFixed(4)),
    };
  }
}
