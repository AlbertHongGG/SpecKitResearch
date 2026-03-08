import { describe, expect, it } from 'vitest';
import { SubscriptionStateMachineService } from '../../../src/modules/subscriptions/subscription-state-machine.service';

describe('SubscriptionStateMachineService', () => {
  const machine = new SubscriptionStateMachineService();

  it('should move Active to PastDue on payment failure', () => {
    expect(machine.applyPaymentFailed('Active' as any)).toBe('PastDue');
  });

  it('should not allow transition from Expired', () => {
    expect(machine.canTransition('Expired' as any, 'Active' as any)).toBe(false);
  });
});
