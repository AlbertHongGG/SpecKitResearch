import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from '../subscriptions.repository';

@Injectable()
export class CancelSubscriptionService {
  constructor(private readonly subscriptionsRepository: SubscriptionsRepository) {}

  async execute(orgId: string) {
    const sub = await this.subscriptionsRepository.getCurrentByOrg(orgId);
    if (!sub) return null;
    return this.subscriptionsRepository.updateById(sub.id, {
      status: 'Canceled',
      canceledAt: new Date(),
    });
  }
}
