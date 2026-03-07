import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [orders, payments, refunds, disputes] =
      await this.prisma.$transaction([
        this.prisma.order.count(),
        this.prisma.payment.count(),
        this.prisma.refundRequest.count(),
        this.prisma.disputeCase.count(),
      ]);

    return {
      orders,
      payments,
      refunds,
      disputes,
    };
  }
}
