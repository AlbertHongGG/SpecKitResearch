"use client";

import { useAppSummary } from '@/features/app/hooks';
import { LoadingState, ErrorState } from '@/components/states';
import { AuthHeader } from '@/components/navigation/auth-header';
import { PastDueBanner } from '@/features/billing/components/pastdue-banner';

type AppSummary = {
  subscription?: {
    status?: string;
    gracePeriodEndAt?: string | null;
    plan?: { name?: string };
  };
};

export default function AppDashboardPage() {
  const { data, isLoading, error, refetch } = useAppSummary();
  const summary = (data ?? null) as AppSummary | null;

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">App Dashboard</h1>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {summary ? (
          <>
            <PastDueBanner status={summary.subscription?.status} gracePeriodEndAt={summary.subscription?.gracePeriodEndAt ?? undefined} />
            <div className="card">
              <p>Plan: {summary.subscription?.plan?.name}</p>
              <p>Status: {summary.subscription?.status}</p>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
