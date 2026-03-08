import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { transitionSubscription } from '../billing/subscription.state';

@Injectable()
export class GraceExpirationJob {
  constructor(private readonly prisma: PrismaService) {}

  async runOnce(now = new Date()) {
    const subs = await this.prisma.subscription.findMany({
      where: {
        isCurrent: true,
        status: 'PastDue',
        gracePeriodEndAt: { not: null, lte: now },
      },
    });

    for (const sub of subs) {
      const next = transitionSubscription(
        { status: sub.status, gracePeriodEndAt: sub.gracePeriodEndAt, canceledAt: sub.canceledAt, expiredAt: sub.expiredAt },
        { type: 'GRACE_EXPIRED', now },
      );
      if (next.status === sub.status) continue;
      await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: next.status } });
    }
  }
}
