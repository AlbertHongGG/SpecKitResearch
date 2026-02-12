'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../src/ui/lib/apiClient';
import { ErrorState, LoadingState } from '../../../src/ui/components/States';

type Resp = {
  counts: {
    usersTotal: number;
    purchasesTotal: number;
    coursesByStatus: { draft: number; submitted: number; published: number; rejected: number; archived: number };
  };
};

export default function AdminStatsPage() {
  const q = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiFetch<Resp>('/api/admin/stats'),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError)
    return <ErrorState message={q.error instanceof Error ? q.error.message : '載入失敗'} onRetry={() => q.refetch()} />;

  const c = q.data!.counts;

  return (
    <div>
      <h1 className="text-xl font-semibold">平台統計</h1>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded border border-slate-200 p-4">
          <div className="text-xs text-slate-600">使用者總數</div>
          <div className="mt-1 text-lg font-semibold">{c.usersTotal}</div>
        </div>
        <div className="rounded border border-slate-200 p-4">
          <div className="text-xs text-slate-600">購買總數</div>
          <div className="mt-1 text-lg font-semibold">{c.purchasesTotal}</div>
        </div>
        <div className="rounded border border-slate-200 p-4">
          <div className="text-xs text-slate-600">已上架課程</div>
          <div className="mt-1 text-lg font-semibold">{c.coursesByStatus.published}</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">數量</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(c.coursesByStatus).map(([status, count]) => (
              <tr key={status} className="border-t border-slate-200">
                <td className="px-3 py-2">{status}</td>
                <td className="px-3 py-2">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
