import { Injectable } from '@nestjs/common';
import { Prisma } from '@sb/db';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class RecurringInvoiceJob {
  constructor(private readonly prisma: PrismaService) {}

  async runOnce(now = new Date()) {
    // Generate recurring invoices for current subscriptions at the start of each new period.
    const subs = await this.prisma.subscription.findMany({
      where: { isCurrent: true, status: { in: ['Active', 'PastDue'] } },
      include: { plan: true },
    });

    for (const sub of subs) {
      // Create invoice for current period (idempotent via unique constraint).
      try {
        await this.prisma.invoice.create({
          data: {
            organizationId: sub.organizationId,
            subscriptionId: sub.id,
            kind: 'Recurring',
            status: 'Open',
            billingPeriodStart: sub.currentPeriodStart,
            billingPeriodEnd: sub.currentPeriodEnd,
            totalCents: sub.plan.priceCents,
            currency: sub.plan.currency,
            lineItems: {
              create: [
                {
                  type: 'RECURRING',
                  description: `Subscription ${sub.plan.name}`,
                  amountCents: sub.plan.priceCents,
                },
              ],
            },
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }
  }
}
