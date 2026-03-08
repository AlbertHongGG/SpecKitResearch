import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../db/prisma.service';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequireOrgRole } from '../../guards/rbac.decorator';
import { getContext } from '../../common/request-context';
import { AppError } from '../../common/app-error';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { SubscriptionService } from '../billing/subscription.service';

const upgradeSchema = z.object({
  targetPlanId: z.string().min(1),
  targetBillingCycle: z.enum(['monthly', 'yearly']),
  confirm: z.boolean(),
});

const downgradeSchema = z.object({
  targetPlanId: z.string().min(1),
  targetBillingCycle: z.enum(['monthly', 'yearly']),
  confirm: z.boolean(),
});

@Controller('app')
@UseGuards(AuthGuard, OrgGuard)
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly subs: SubscriptionService,
  ) {}

  @Get('subscription')
  async getSubscription(@Req() req: Request) {
    const ctx = getContext(req);
    const sub = await this.prisma.subscription.findFirst({
      where: { organizationId: ctx.org!.id, isCurrent: true },
      include: { plan: true },
    });
    if (!sub) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Subscription not found' });
    }

    const ent = await this.entitlements.computeForOrg(ctx.org!.id);

    const pendingChange =
      sub.pendingPlanId && sub.pendingEffectiveAt
        ? { pendingPlanId: sub.pendingPlanId, effectiveAt: sub.pendingEffectiveAt.toISOString() }
        : undefined;

    return {
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
    };
  }

  @Post('subscription/upgrade')
  @UseGuards(RbacGuard)
  @RequireOrgRole('ORG_ADMIN')
  async upgrade(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = upgradeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const { updatedSub, invoice } = await this.subs.upgrade(ctx.org!.id, ctx.user!.id, {
      targetPlanId: parsed.data.targetPlanId,
      confirm: parsed.data.confirm,
    });

    const ent = await this.entitlements.computeForOrg(ctx.org!.id);

    const subscription = await this.prisma.subscription.findUnique({ where: { id: updatedSub.id }, include: { plan: true } });
    if (!subscription) {
      throw new AppError({ errorCode: 'INTERNAL_ERROR', status: 500, message: 'Subscription missing after upgrade' });
    }

    const subResponse = {
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        billingCycle: subscription.plan.billingCycle,
        priceCents: subscription.plan.priceCents,
        currency: subscription.plan.currency,
        isActive: subscription.plan.isActive,
        limits: subscription.plan.limits,
        features: subscription.plan.features,
      },
      currentPeriod: { start: subscription.currentPeriodStart.toISOString(), end: subscription.currentPeriodEnd.toISOString() },
      trialEndAt: subscription.trialEndAt?.toISOString() ?? null,
      gracePeriodEndAt: subscription.gracePeriodEndAt?.toISOString() ?? null,
      entitlements: ent,
    };

    return {
      subscription: subResponse,
      prorationInvoice: {
        id: invoice.id,
        status: invoice.status,
        billingPeriod: { start: invoice.billingPeriodStart.toISOString(), end: invoice.billingPeriodEnd.toISOString() },
        totalCents: invoice.totalCents,
        currency: invoice.currency,
        dueAt: invoice.dueAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        failedAt: invoice.failedAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
      },
    };
  }

  @Post('subscription/downgrade')
  @UseGuards(RbacGuard)
  @RequireOrgRole('ORG_ADMIN')
  async downgrade(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = downgradeSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const updated = await this.subs.downgrade(ctx.org!.id, ctx.user!.id, {
      targetPlanId: parsed.data.targetPlanId,
      confirm: parsed.data.confirm,
    });

    const ent = await this.entitlements.computeForOrg(ctx.org!.id);
    const withPlan = await this.prisma.subscription.findUnique({ where: { id: updated.id }, include: { plan: true } });
    if (!withPlan) {
      throw new AppError({ errorCode: 'INTERNAL_ERROR', status: 500, message: 'Subscription missing after downgrade' });
    }

    return {
      subscription: {
        status: withPlan.status,
        billingCycle: withPlan.billingCycle,
        plan: {
          id: withPlan.plan.id,
          name: withPlan.plan.name,
          billingCycle: withPlan.plan.billingCycle,
          priceCents: withPlan.plan.priceCents,
          currency: withPlan.plan.currency,
          isActive: withPlan.plan.isActive,
          limits: withPlan.plan.limits,
          features: withPlan.plan.features,
        },
        currentPeriod: { start: withPlan.currentPeriodStart.toISOString(), end: withPlan.currentPeriodEnd.toISOString() },
        trialEndAt: withPlan.trialEndAt?.toISOString() ?? null,
        gracePeriodEndAt: withPlan.gracePeriodEndAt?.toISOString() ?? null,
        ...(withPlan.pendingPlanId && withPlan.pendingEffectiveAt
          ? { pendingChange: { pendingPlanId: withPlan.pendingPlanId, effectiveAt: withPlan.pendingEffectiveAt.toISOString() } }
          : {}),
        entitlements: ent,
      },
    };
  }

  @Post('subscription/cancel')
  @UseGuards(RbacGuard)
  @RequireOrgRole('ORG_ADMIN')
  async cancel(@Req() req: Request) {
    const ctx = getContext(req);
    const updated = await this.subs.cancel(ctx.org!.id, ctx.user!.id);
    const ent = await this.entitlements.computeForOrg(ctx.org!.id);
    const withPlan = await this.prisma.subscription.findUnique({ where: { id: updated.id }, include: { plan: true } });
    if (!withPlan) {
      throw new AppError({ errorCode: 'INTERNAL_ERROR', status: 500, message: 'Subscription missing after cancel' });
    }

    return {
      subscription: {
        status: withPlan.status,
        billingCycle: withPlan.billingCycle,
        plan: {
          id: withPlan.plan.id,
          name: withPlan.plan.name,
          billingCycle: withPlan.plan.billingCycle,
          priceCents: withPlan.plan.priceCents,
          currency: withPlan.plan.currency,
          isActive: withPlan.plan.isActive,
          limits: withPlan.plan.limits,
          features: withPlan.plan.features,
        },
        currentPeriod: { start: withPlan.currentPeriodStart.toISOString(), end: withPlan.currentPeriodEnd.toISOString() },
        trialEndAt: withPlan.trialEndAt?.toISOString() ?? null,
        gracePeriodEndAt: withPlan.gracePeriodEndAt?.toISOString() ?? null,
        entitlements: ent,
      },
    };
  }
}
