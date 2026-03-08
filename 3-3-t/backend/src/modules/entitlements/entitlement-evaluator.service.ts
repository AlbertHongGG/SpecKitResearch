import { Injectable } from '@nestjs/common';
import { reasonCode } from '../../common/errors/reason-code.mapper';

type SubscriptionStatus = 'Trial' | 'Active' | 'PastDue' | 'Suspended' | 'Canceled' | 'Expired';

@Injectable()
export class EntitlementEvaluatorService {
  evaluate(input: {
    forcedStatus?: 'NONE' | 'Suspended' | 'Expired';
    status: SubscriptionStatus;
    features: Record<string, boolean>;
    usage: Record<string, number>;
    limits: Record<string, number>;
  }) {
    const reasonCodes: string[] = [];

    if (input.forcedStatus === 'Expired') {
      return { effectiveStatus: 'Expired', reasonCodes: [reasonCode.forcedExpired], decisions: {} };
    }

    if (input.forcedStatus === 'Suspended') {
      return { effectiveStatus: 'Suspended', reasonCodes: [reasonCode.forcedSuspended], decisions: {} };
    }

    if (input.status === 'Expired') reasonCodes.push(reasonCode.statusExpired);
    if (input.status === 'Canceled') reasonCodes.push(reasonCode.statusCanceled);
    if (input.status === 'Suspended') reasonCodes.push(reasonCode.statusSuspended);
    if (input.status === 'PastDue') reasonCodes.push(reasonCode.statusPastDue);

    const decisions: Record<string, { allowed: boolean; reasonCode?: string; currentUsage?: number; limit?: number }> = {};

    for (const [feature, enabled] of Object.entries(input.features)) {
      if (!enabled) {
        decisions[feature] = { allowed: false, reasonCode: reasonCode.featureDisabled };
        continue;
      }

      const usageKey = feature.toUpperCase();
      const currentUsage = input.usage[usageKey] ?? 0;
      const limit = input.limits[usageKey] ?? Number.MAX_SAFE_INTEGER;
      if (currentUsage > limit) {
        decisions[feature] = {
          allowed: false,
          reasonCode: reasonCode.overLimitBlock,
          currentUsage,
          limit,
        };
      } else {
        decisions[feature] = { allowed: !['Suspended', 'Expired'].includes(input.status) };
      }
    }

    return {
      effectiveStatus: input.status,
      reasonCodes,
      decisions,
    };
  }
}
