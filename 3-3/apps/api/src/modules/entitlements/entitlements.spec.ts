import { computeEntitlements } from './entitlements.logic';

describe('entitlements', () => {
  const plan = {
    id: 'Pro-monthly',
    name: 'Pro',
    billingCycle: 'monthly' as const,
    priceCents: 3000,
    currency: 'USD',
    isActive: true,
    limits: { API_CALLS: 1000, USER_COUNT: 10 },
    features: { advancedAnalytics: true },
  };

  it('admin override Expired wins', () => {
    const out = computeEntitlements({
      plan,
      subscriptionStatus: 'Active',
      forcedStatus: 'Expired',
      usage: {},
    });
    expect(out.features).toEqual({});
    expect(out.statusReason).toBe('AdminOverrideExpired');
  });

  it('Suspended subscription disables features', () => {
    const out = computeEntitlements({
      plan,
      subscriptionStatus: 'Suspended',
      forcedStatus: 'NONE',
      usage: {},
    });
    expect(out.features).toEqual({});
    expect(out.statusReason).toBe('SubscriptionSuspended');
  });

  it('PastDue keeps plan features but marks reason', () => {
    const out = computeEntitlements({
      plan,
      subscriptionStatus: 'PastDue',
      forcedStatus: 'NONE',
      usage: { API_CALLS: 42 },
    });
    expect(out.features.advancedAnalytics).toBe(true);
    expect(out.limits.API_CALLS).toEqual({ limit: 1000, used: 42 });
    expect(out.statusReason).toBe('SubscriptionPastDue');
  });
});
