import { transitionSubscription } from './subscription.state';

describe('subscription.state', () => {
  it('moves Active -> PastDue on payment failure and sets grace', () => {
    const now = new Date('2026-03-04T00:00:00.000Z');
    const next = transitionSubscription({ status: 'Active' }, { type: 'PAYMENT_FAILED', now, graceDays: 7 });
    expect(next.status).toBe('PastDue');
    expect(next.gracePeriodEndAt?.toISOString()).toBe('2026-03-11T00:00:00.000Z');
  });

  it('moves PastDue -> Active on payment success and clears grace', () => {
    const now = new Date('2026-03-04T00:00:00.000Z');
    const next = transitionSubscription(
      { status: 'PastDue', gracePeriodEndAt: new Date('2026-03-11T00:00:00.000Z') },
      { type: 'PAYMENT_SUCCEEDED', now },
    );
    expect(next.status).toBe('Active');
    expect(next.gracePeriodEndAt).toBeNull();
  });

  it('moves PastDue -> Suspended when grace expired', () => {
    const now = new Date('2026-03-12T00:00:00.000Z');
    const next = transitionSubscription(
      { status: 'PastDue', gracePeriodEndAt: new Date('2026-03-11T00:00:00.000Z') },
      { type: 'GRACE_EXPIRED', now },
    );
    expect(next.status).toBe('Suspended');
  });

  it('keeps Expired irreversible', () => {
    const now = new Date('2026-03-12T00:00:00.000Z');
    const next = transitionSubscription(
      { status: 'Expired', expiredAt: new Date('2026-03-01T00:00:00.000Z') },
      { type: 'PAYMENT_SUCCEEDED', now },
    );
    expect(next.status).toBe('Expired');
  });
});
