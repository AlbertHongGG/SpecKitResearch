import { Injectable } from '@nestjs/common';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { UsagePeriodService } from '../usage/use-cases/usage-period.service';

@Injectable()
export class BillingSchedulerService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly usagePeriodService: UsagePeriodService,
  ) {}

  async runPeriodBoundary(orgId: string) {
    await this.usagePeriodService.ensurePendingDowngradeApplied(orgId);
    return this.subscriptionsRepository.getCurrentByOrg(orgId);
  }
}
