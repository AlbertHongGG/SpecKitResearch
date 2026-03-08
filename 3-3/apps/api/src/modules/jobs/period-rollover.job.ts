import { Injectable } from '@nestjs/common';
import { Prisma } from '@sb/db';
import { PrismaService } from '../db/prisma.service';

function addMonthsUTC(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

function addYearsUTC(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class PeriodRolloverJob {
  constructor(private readonly prisma: PrismaService) {}

  async runOnce(now = new Date()) {
    const due = await this.prisma.subscription.findMany({
      where: {
        isCurrent: true,
        currentPeriodEnd: { lte: now },
        status: { in: ['Active', 'PastDue'] },
      },
    });

    for (const sub of due) {
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.subscription.findUnique({ where: { id: sub.id } });
        if (!fresh) return;
        if (fresh.currentPeriodEnd.getTime() > now.getTime()) return;

        const nextStart = fresh.currentPeriodEnd;
        const nextEnd =
          fresh.billingCycle === 'monthly' ? addMonthsUTC(nextStart, 1) : addYearsUTC(nextStart, 1);

        const shouldApplyPending =
          fresh.pendingPlanId && fresh.pendingEffectiveAt && fresh.pendingEffectiveAt.getTime() <= fresh.currentPeriodEnd.getTime();

        await tx.subscription.update({
          where: { id: fresh.id },
          data: {
            planId: shouldApplyPending ? fresh.pendingPlanId! : fresh.planId,
            pendingPlanId: null,
            pendingEffectiveAt: null,
            currentPeriodStart: nextStart,
            currentPeriodEnd: nextEnd,
          },
        });
      });
    }
  }
}
