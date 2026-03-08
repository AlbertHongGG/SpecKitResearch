import { describe, expect, it } from 'vitest';
import { SubscriptionStateMachineService } from '../../../src/modules/subscriptions/subscription-state-machine.service';

describe('pastdue to suspension flow', () => {
  const machine = new SubscriptionStateMachineService();

  it('moves PastDue to Suspended when grace expired', () => {
    expect(machine.applyGraceExpired('PastDue' as any)).toBe('Suspended');
  });
});
