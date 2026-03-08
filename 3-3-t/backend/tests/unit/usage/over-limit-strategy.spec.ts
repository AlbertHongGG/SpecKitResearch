import { describe, expect, it } from 'vitest';
import { EnforceUsagePolicyService } from '../../../src/modules/usage/use-cases/enforce-usage-policy.service';

describe('over limit strategy', () => {
  const service = new EnforceUsagePolicyService();

  it('blocks when strategy is Block', () => {
    expect(service.evaluate(101, 100, 'Block').allowed).toBe(false);
  });

  it('allows with overage strategy', () => {
    expect(service.evaluate(101, 100, 'Overage').allowed).toBe(true);
  });
});
