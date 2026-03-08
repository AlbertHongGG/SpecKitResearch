import { describe, expect, it } from 'vitest';
import { EntitlementEvaluatorService } from '../../../src/modules/entitlements/entitlement-evaluator.service';

describe('override precedence', () => {
  it('forced suspended overrides active status', () => {
    const service = new EntitlementEvaluatorService();
    const result = service.evaluate({
      forcedStatus: 'Suspended',
      status: 'Active' as any,
      features: {},
      usage: {},
      limits: {},
    });
    expect(result.effectiveStatus).toBe('Suspended');
  });
});
