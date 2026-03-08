import { describe, expect, it } from 'vitest';
import { EntitlementEvaluatorService } from '../../../src/modules/entitlements/entitlement-evaluator.service';

describe('EntitlementEvaluatorService', () => {
  const service = new EntitlementEvaluatorService();

  it('denies all when forced expired', () => {
    const result = service.evaluate({
      forcedStatus: 'Expired',
      status: 'Active' as any,
      features: { advancedAnalytics: true },
      usage: {},
      limits: {},
    });
    expect(result.effectiveStatus).toBe('Expired');
  });
});
