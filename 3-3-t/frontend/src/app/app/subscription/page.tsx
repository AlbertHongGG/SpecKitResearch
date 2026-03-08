"use client";

import { useSubscription } from '@/features/app/hooks';
import { useEntitlements } from '@/features/entitlements/use-entitlements';
import { FeatureGate } from '@/components/auth/feature-gate';
import { AuthHeader } from '@/components/navigation/auth-header';
import { LoadingState, ErrorState } from '@/components/states';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

type SubscriptionView = {
  plan: { id: string; name: string };
  status: string;
  billingCycle: string;
  currentPeriodEnd: string;
  pendingPlanId?: string | null;
};

export default function SubscriptionPage() {
  const { organizationId } = useSession();
  const { data, isLoading, error, refetch } = useSubscription();
  const subscription = (data ?? null) as SubscriptionView | null;
  const entitlements = useEntitlements();
  const entitlementData = (entitlements.data ?? undefined) as { decisions?: Record<string, unknown> } | undefined;

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Subscription</h1>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {subscription ? (
          <div className="card space-y-2">
            <p>Plan: {subscription.plan?.name}</p>
            <p>Status: {subscription.status}</p>
            <p>Billing Cycle: {subscription.billingCycle}</p>
            <p>Next Billing: {subscription.currentPeriodEnd}</p>
            {subscription.pendingPlanId ? <p>Pending Downgrade: {subscription.pendingPlanId}</p> : null}
            <div className="flex gap-2">
              <FeatureGate allowed={Boolean(entitlementData?.decisions)} fallback={<span className="text-xs text-gray-500">需要 Org Admin</span>}>
                <button
                  className="rounded bg-blue-600 px-3 py-1 text-white"
                  onClick={() => apiFetch('/subscriptions/upgrade', { method: 'POST', body: JSON.stringify({ targetPlanId: subscription.plan.id, billingCycle: 'monthly' }) }, organizationId)}
                >
                  Upgrade
                </button>
              </FeatureGate>
              <button
                className="rounded bg-amber-600 px-3 py-1 text-white"
                onClick={() => apiFetch('/subscriptions/downgrade', { method: 'POST', body: JSON.stringify({ targetPlanId: subscription.plan.id, billingCycle: 'monthly' }) }, organizationId)}
              >
                Downgrade
              </button>
              <button
                className="rounded bg-red-600 px-3 py-1 text-white"
                onClick={() => apiFetch('/subscriptions/cancel', { method: 'POST' }, organizationId)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
