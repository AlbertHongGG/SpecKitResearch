"use client";

import { useUsage } from '@/features/app/hooks';
import { AuthHeader } from '@/components/navigation/auth-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';

type UsageMeter = { meterCode: string; value: number; limit: number; strategy: string };

export default function UsagePage() {
  const { data, isLoading, error, refetch } = useUsage();
  const meters: UsageMeter[] = Array.isArray((data as { meters?: unknown[] } | undefined)?.meters)
    ? (((data as { meters?: unknown[] }).meters ?? []) as UsageMeter[])
    : [];

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Usage</h1>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {!isLoading && meters.length === 0 ? <EmptyState title="目前沒有使用量資料" /> : null}
        {meters.map((meter) => (
          <div className="card" key={meter.meterCode}>
            <p className="font-medium">{meter.meterCode}</p>
            <p>{meter.value} / {meter.limit}</p>
            <p className="text-sm text-gray-600">策略：{meter.strategy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
