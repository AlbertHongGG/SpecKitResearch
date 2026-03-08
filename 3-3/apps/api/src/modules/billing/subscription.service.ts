import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/app-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../db/prisma.service';
import { calculateProrationCents } from './proration';
import { transitionSubscription } from './subscription.state';
import { transitionInvoice } from './invoice.state';
import { InvoicesRepo } from './invoices.repo';
import { SubscriptionsRepo } from './subscriptions.repo';
import { SubscriptionGuard } from './subscription.guard';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subs: SubscriptionsRepo,
    private readonly invoices: InvoicesRepo,
    private readonly audit: AuditService,
    private readonly guard: SubscriptionGuard,
  ) {}

  async upgrade(orgId: string, actorUserId: string, input: { targetPlanId: string; confirm: boolean }) {
    if (!input.confirm) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: 'Confirmation required' });
    }

    const current = await this.subs.getCurrentForOrgWithPlan(orgId);
    if (!current) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Subscription not found' });
    }
    this.guard.assertNotExpired(current.status);

    const target = await this.prisma.plan.findUnique({ where: { id: input.targetPlanId } });
    if (!target) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Plan not found' });
    }
    if (!target.isActive) {
      throw new AppError({ errorCode: 'FORBIDDEN', status: 403, message: 'Plan is not active' });
    }

    const prorationCents = calculateProrationCents({
      fromPriceCents: current.plan.priceCents,
      toPriceCents: target.priceCents,
      periodStart: current.currentPeriodStart,
      periodEnd: current.currentPeriodEnd,
      at: new Date(),
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSub = await tx.subscription.update({
        where: { id: current.id },
        data: { planId: target.id, pendingPlanId: null, pendingEffectiveAt: null },
        include: { plan: true, pendingPlan: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          organizationId: orgId,
          subscriptionId: updatedSub.id,
          kind: 'Proration',
          status: 'Open',
          billingPeriodStart: updatedSub.currentPeriodStart,
          billingPeriodEnd: updatedSub.currentPeriodEnd,
          totalCents: prorationCents,
          currency: target.currency,
          lineItems: {
            create: [
              {
                type: 'PRORATION',
                description: `Proration upgrade to ${target.name}`,
                amountCents: prorationCents,
              },
            ],
          },
        },
        include: { lineItems: true },
      });
      return { updatedSub, invoice };
    });

    await this.audit.writeAuditLog({
      actorUserId,
      actorRoleContext: 'ORG_ADMIN',
      organizationId: orgId,
      action: 'billing.subscription.upgrade',
      targetType: 'Subscription',
      targetId: result.updatedSub.id,
      payload: { targetPlanId: target.id, prorationCents },
    });

    return result;
  }

  async downgrade(orgId: string, actorUserId: string, input: { targetPlanId: string; confirm: boolean }) {
    if (!input.confirm) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: 'Confirmation required' });
    }

    const current = await this.subs.getCurrentForOrgWithPlan(orgId);
    if (!current) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Subscription not found' });
    }
    this.guard.assertNotExpired(current.status);

    const target = await this.prisma.plan.findUnique({ where: { id: input.targetPlanId } });
    if (!target) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Plan not found' });
    }
    if (!target.isActive) {
      throw new AppError({ errorCode: 'FORBIDDEN', status: 403, message: 'Plan is not active' });
    }

    const effectiveAt = current.currentPeriodEnd;

    const updated = await this.prisma.subscription.update({
      where: { id: current.id },
      data: { pendingPlanId: target.id, pendingEffectiveAt: effectiveAt },
      include: { plan: true, pendingPlan: true },
    });

    await this.audit.writeAuditLog({
      actorUserId,
      actorRoleContext: 'ORG_ADMIN',
      organizationId: orgId,
      action: 'billing.subscription.downgrade',
      targetType: 'Subscription',
      targetId: updated.id,
      payload: { pendingPlanId: target.id, effectiveAt: effectiveAt.toISOString() },
    });

    return updated;
  }

  async cancel(orgId: string, actorUserId: string) {
    const current = await this.subs.getCurrentForOrgWithPlan(orgId);
    if (!current) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Subscription not found' });
    }
    this.guard.assertNotExpired(current.status);

    const transitioned = transitionSubscription(
      {
        status: current.status,
        gracePeriodEndAt: current.gracePeriodEndAt,
        canceledAt: current.canceledAt,
        expiredAt: current.expiredAt,
      },
      { type: 'CANCEL', now: new Date() },
    );

    const updated = await this.prisma.subscription.update({
      where: { id: current.id },
      data: {
        status: transitioned.status,
        canceledAt: transitioned.canceledAt,
      },
      include: { plan: true, pendingPlan: true },
    });

    await this.audit.writeAuditLog({
      actorUserId,
      actorRoleContext: 'ORG_ADMIN',
      organizationId: orgId,
      action: 'billing.subscription.cancel',
      targetType: 'Subscription',
      targetId: updated.id,
      payload: {},
    });

    return updated;
  }

  async applyPaymentResult(input: { orgId: string; invoiceId: string; result: 'success' | 'fail' }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { subscription: true },
    });
    if (!invoice || invoice.organizationId !== input.orgId) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Invoice not found' });
    }

    const now = new Date();
    const invNext =
      input.result === 'success'
        ? transitionInvoice({ status: invoice.status, paidAt: invoice.paidAt, failedAt: invoice.failedAt }, { type: 'PAYMENT_SUCCEEDED', paidAt: now })
        : transitionInvoice({ status: invoice.status, paidAt: invoice.paidAt, failedAt: invoice.failedAt }, { type: 'PAYMENT_FAILED', failedAt: now });

    const sub = invoice.subscription;
    this.guard.assertNotExpired(sub.status);
    const subNext =
      input.result === 'success'
        ? transitionSubscription(
            { status: sub.status, gracePeriodEndAt: sub.gracePeriodEndAt, canceledAt: sub.canceledAt, expiredAt: sub.expiredAt },
            { type: 'PAYMENT_SUCCEEDED', now },
          )
        : transitionSubscription(
            { status: sub.status, gracePeriodEndAt: sub.gracePeriodEndAt, canceledAt: sub.canceledAt, expiredAt: sub.expiredAt },
            { type: 'PAYMENT_FAILED', now },
          );

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: invNext.status,
          paidAt: invNext.paidAt ?? null,
          failedAt: invNext.failedAt ?? null,
        },
      });

      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: subNext.status,
          gracePeriodEndAt: subNext.gracePeriodEndAt ?? null,
        },
      });
    });
  }
}
