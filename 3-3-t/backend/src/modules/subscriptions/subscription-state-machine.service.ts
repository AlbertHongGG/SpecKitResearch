import { Injectable } from '@nestjs/common';

type SubscriptionStatus = 'Trial' | 'Active' | 'PastDue' | 'Suspended' | 'Canceled' | 'Expired';

@Injectable()
export class SubscriptionStateMachineService {
  canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
    if (from === 'Expired') return false;
    if (from === 'Canceled' && to === 'Active') return false;
    return true;
  }

  applyPaymentFailed(current: SubscriptionStatus): SubscriptionStatus {
    if (current === 'Active' || current === 'Trial') {
      return 'PastDue';
    }
    return current;
  }

  applyGraceExpired(current: SubscriptionStatus): SubscriptionStatus {
    if (current === 'PastDue') return 'Suspended';
    return current;
  }

  applyPaymentRecovered(current: SubscriptionStatus): SubscriptionStatus {
    if (current === 'PastDue' || current === 'Suspended') {
      return 'Active';
    }
    return current;
  }
}
