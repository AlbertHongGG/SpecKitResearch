'use client';

import { useQuery } from '@tanstack/react-query';

import { StatsCards } from '@/components/admin/StatsCards';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { adminClient } from '@/services/adminClient';

export default function AdminStatsPage() {
  const q = useQuery({ queryKey: queryKeys.stats(), queryFn: adminClient.stats });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any)?.message ?? '載入失敗'} />;
  if (!q.data) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">統計</h1>
      <div className="mt-6">
        <StatsCards stats={q.data} />
      </div>
    </div>
  );
}
