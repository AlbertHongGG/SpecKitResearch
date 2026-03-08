import { BadRequestException, Injectable } from '@nestjs/common';
import { PlansRepository } from '../../plans/plans.repository';
import { SubscriptionsRepository } from '../subscriptions.repository';

@Injectable()
export class DowngradeSubscriptionService {
  constructor(
    private readonly plansRepository: PlansRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  async execute(orgId: string, input: { targetPlanId: string; billingCycle: string }) {
    const sub = await this.subscriptionsRepository.getCurrentByOrg(orgId);
    if (!sub) throw new BadRequestException('Subscription not found');

    const plan = await this.plansRepository.getById(input.targetPlanId);
    if (!plan || !plan.isActive) throw new BadRequestException('Target plan unavailable');

    return this.subscriptionsRepository.updateById(sub.id, {
      pendingPlanId: input.targetPlanId,
      pendingEffectiveAt: sub.currentPeriodEnd,
    });
  }
}
