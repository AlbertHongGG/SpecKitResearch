import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../db/prisma.service';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { getContext } from '../../common/request-context';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { UsageService } from '../usage/usage.service';

@Controller('app/dashboard')
@UseGuards(AuthGuard, OrgGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly usage: UsageService,
  ) {}

  @Get()
  async dashboard(@Req() req: Request) {
    const ctx = getContext(req);
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: ctx.org!.id, isCurrent: true },
      include: { plan: true },
    });
    if (!sub) {
      // Invariants say every org should have a current subscription.
      throw new Error('Missing current subscription');
    }
    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId: ctx.org!.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const usage = await this.usage.getUsageOverview(ctx.org!.id);
    const ent = await this.entitlements.computeForOrg(ctx.org!.id);

    const pendingChange =
      sub.pendingPlanId && sub.pendingEffectiveAt
        ? { pendingPlanId: sub.pendingPlanId, effectiveAt: sub.pendingEffectiveAt.toISOString() }
        : undefined;

    return {
      subscription: {
        status: sub.status,
        billingCycle: sub.billingCycle,
        plan: {
          id: sub.plan.id,
          name: sub.plan.name,
          billingCycle: sub.plan.billingCycle,
          priceCents: sub.plan.priceCents,
          currency: sub.plan.currency,
          isActive: sub.plan.isActive,
          limits: sub.plan.limits,
          features: sub.plan.features,
        },
        currentPeriod: { start: sub.currentPeriodStart.toISOString(), end: sub.currentPeriodEnd.toISOString() },
        trialEndAt: sub.trialEndAt?.toISOString() ?? null,
        gracePeriodEndAt: sub.gracePeriodEndAt?.toISOString() ?? null,
        ...(pendingChange ? { pendingChange } : {}),
        entitlements: ent,
      },
      usage,
      recentInvoices: invoices.map((i) => ({
        id: i.id,
        status: i.status,
        billingPeriod: { start: i.billingPeriodStart.toISOString(), end: i.billingPeriodEnd.toISOString() },
        totalCents: i.totalCents,
        currency: i.currency,
        dueAt: i.dueAt?.toISOString() ?? null,
        paidAt: i.paidAt?.toISOString() ?? null,
        failedAt: i.failedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
      })),
    };
  }
}
