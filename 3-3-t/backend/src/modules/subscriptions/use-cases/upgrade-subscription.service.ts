import { BadRequestException, Injectable } from '@nestjs/common';
import { PlansRepository } from '../../plans/plans.repository';
import { SubscriptionsRepository } from '../subscriptions.repository';
import { InvoicesRepository } from '../../invoices/invoices.repository';

@Injectable()
export class UpgradeSubscriptionService {
  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly invoicesRepository: InvoicesRepository,
  ) {}

  async execute(orgId: string, input: { targetPlanId: string; billingCycle: string }) {
    const sub = await this.subscriptionsRepository.getCurrentByOrg(orgId);
    if (!sub) throw new BadRequestException('Subscription not found');

    const plan = await this.plansRepository.getById(input.targetPlanId);
    if (!plan || !plan.isActive) throw new BadRequestException('Target plan unavailable');

    const updated = await this.subscriptionsRepository.updateById(sub.id, {
      planId: input.targetPlanId,
      billingCycle: input.billingCycle,
      status: 'Active',
      pendingPlanId: null,
      pendingEffectiveAt: null,
    });

    const proration = Math.max(plan.priceCents - sub.plan.priceCents, 0);
    const invoice = await this.invoicesRepository.create({
      organizationId: orgId,
      subscriptionId: sub.id,
      status: 'Open',
      billingPeriodStart: new Date(),
      billingPeriodEnd: sub.currentPeriodEnd,
      totalCents: proration,
      currency: plan.currency,
      invoiceType: 'PRORATION',
    });

    return { subscription: updated, prorationInvoice: invoice };
  }
}
