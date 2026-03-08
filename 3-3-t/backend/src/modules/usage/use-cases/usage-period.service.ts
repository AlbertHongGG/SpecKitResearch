import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from '../../subscriptions/subscriptions.repository';

@Injectable()
export class UsagePeriodService {
  constructor(private readonly subscriptionsRepository: SubscriptionsRepository) {}

  async ensurePendingDowngradeApplied(orgId: string) {
    const sub = await this.subscriptionsRepository.getCurrentByOrg(orgId);
    if (!sub) return null;
    if (sub.pendingPlanId && sub.pendingEffectiveAt && sub.pendingEffectiveAt <= new Date()) {
      return this.subscriptionsRepository.updateById(sub.id, {
        planId: sub.pendingPlanId,
        pendingPlanId: null,
        pendingEffectiveAt: null,
      });
    }
    return sub;
  }
}
