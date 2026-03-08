import { SubscriptionStatus } from '@sb/db';

export const DEFAULT_GRACE_PERIOD_DAYS = 7;

export type SubscriptionEvent =
  | { type: 'PAYMENT_FAILED'; now: Date; graceDays?: number }
  | { type: 'PAYMENT_SUCCEEDED'; now: Date }
  | { type: 'GRACE_EXPIRED'; now: Date }
  | { type: 'CANCEL'; now: Date }
  | { type: 'EXPIRE'; now: Date };

export function addDaysUTC(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

export function transitionSubscription(
  input: {
    status: SubscriptionStatus;
    gracePeriodEndAt?: Date | null;
    canceledAt?: Date | null;
    expiredAt?: Date | null;
  },
  event: SubscriptionEvent,
): {
  status: SubscriptionStatus;
  gracePeriodEndAt?: Date | null;
  canceledAt?: Date | null;
  expiredAt?: Date | null;
} {
  if (input.status === 'Expired') {
    return input;
  }

  switch (event.type) {
    case 'PAYMENT_FAILED': {
      if (input.status === 'Canceled') return input;
      if (input.status === 'Suspended') return input;
      const graceDays = event.graceDays ?? DEFAULT_GRACE_PERIOD_DAYS;
      return {
        ...input,
        status: 'PastDue',
        gracePeriodEndAt: addDaysUTC(event.now, graceDays),
      };
    }
    case 'PAYMENT_SUCCEEDED': {
      if (input.status === 'PastDue') {
        return { ...input, status: 'Active', gracePeriodEndAt: null };
      }
      return input;
    }
    case 'GRACE_EXPIRED': {
      if (input.status === 'PastDue') {
        if (input.gracePeriodEndAt && input.gracePeriodEndAt.getTime() <= event.now.getTime()) {
          return { ...input, status: 'Suspended' };
        }
      }
      return input;
    }
    case 'CANCEL': {
      if (input.status === 'Canceled') return input;
      return { ...input, status: 'Canceled', canceledAt: event.now };
    }
    case 'EXPIRE': {
      return { ...input, status: 'Expired', expiredAt: event.now };
    }
  }
}
