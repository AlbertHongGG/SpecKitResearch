import { describe, expect, it } from 'vitest';
import { entitlementResponseSchema } from '../../../shared/contracts/zod/index';

describe('entitlements contract', () => {
  it('validates entitlement response shape', () => {
    const parsed = entitlementResponseSchema.safeParse({
      effectiveStatus: 'Active',
      reasonCodes: [],
      decisions: {},
      evaluatedAt: new Date().toISOString(),
    });
    expect(parsed.success).toBe(true);
  });
});
