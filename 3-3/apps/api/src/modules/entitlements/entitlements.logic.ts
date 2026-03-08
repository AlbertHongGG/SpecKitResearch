import type { ForcedStatus, SubscriptionStatus } from '@sb/db';

export type PlanShape = {
  id: string;
  name: string;
  billingCycle: 'monthly' | 'yearly';
  priceCents: number;
  currency: string;
  isActive: boolean;
  limits: Record<string, unknown>;
  features: Record<string, boolean>;
};

export type UsageSnapshot = Record<string, number>;

export type EntitlementsOutput = {
  features: Record<string, boolean>;
  limits: Record<string, unknown>;
  statusReason?: string;
};

export function computeEntitlements(input: {
  plan: PlanShape;
  subscriptionStatus: SubscriptionStatus;
  forcedStatus: ForcedStatus;
  usage: UsageSnapshot;
}): EntitlementsOutput {
  // Precedence: forced override first.
  if (input.forcedStatus === 'Expired') {
    return { features: {}, limits: {}, statusReason: 'AdminOverrideExpired' };
  }
  if (input.forcedStatus === 'Suspended') {
    return { features: {}, limits: {}, statusReason: 'AdminOverrideSuspended' };
  }

  if (input.subscriptionStatus === 'Expired') {
    return { features: {}, limits: {}, statusReason: 'SubscriptionExpired' };
  }
  if (input.subscriptionStatus === 'Suspended') {
    return { features: {}, limits: {}, statusReason: 'SubscriptionSuspended' };
  }
  if (input.subscriptionStatus === 'Canceled') {
    // keep read-only features off for MVP; cancellation means no service.
    return { features: {}, limits: {}, statusReason: 'SubscriptionCanceled' };
  }

  // PastDue: allow limited service; we keep features but attach reason.
  const statusReason = input.subscriptionStatus === 'PastDue' ? 'SubscriptionPastDue' : undefined;

  const features = { ...input.plan.features };

  // Limits: echo plan limits and attach usage value when numeric.
  const limits: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input.plan.limits ?? {})) {
    const used = input.usage[key] ?? 0;
    if (typeof value === 'number') {
      limits[key] = { limit: value, used };
    } else {
      limits[key] = value;
    }
  }

  return { features, limits, statusReason };
}
