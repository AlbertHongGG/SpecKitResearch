import { Injectable } from '@nestjs/common';
import { AdminOverrideRepository } from '../admin/admin-override.repository';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { UsageRecordsRepository } from '../usage/usage-records.repository';
import { EntitlementEvaluatorService } from './entitlement-evaluator.service';

type SubscriptionStatus = 'Trial' | 'Active' | 'PastDue' | 'Suspended' | 'Canceled' | 'Expired';

@Injectable()
export class EntitlementDecisionService {
  constructor(
    private readonly adminOverrideRepository: AdminOverrideRepository,
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly usageRecordsRepository: UsageRecordsRepository,
    private readonly evaluator: EntitlementEvaluatorService,
  ) {}

  async resolve(orgId: string) {
    const [override, sub, usageRows] = await Promise.all([
      this.adminOverrideRepository.latestByOrg(orgId),
      this.subscriptionsRepository.getCurrentByOrg(orgId),
      this.usageRecordsRepository.listByOrg(orgId),
    ]);

    if (!sub) {
      return { effectiveStatus: 'Expired', reasonCodes: ['SUBSCRIPTION_NOT_FOUND'], decisions: {}, evaluatedAt: new Date().toISOString() };
    }

    const features = JSON.parse(sub.plan.features || '{}');
    const limits = JSON.parse(sub.plan.limits || '{}');
    const usage: Record<string, number> = {};
    usageRows.forEach((row) => {
      usage[row.meterCode] = row.value;
    });

    const result = this.evaluator.evaluate({
      forcedStatus: override?.revokedAt ? 'NONE' : (override?.forcedStatus as any),
      status: sub.status as SubscriptionStatus,
      features,
      limits,
      usage,
    });

    return {
      ...result,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
