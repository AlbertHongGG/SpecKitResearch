import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { isApiError } from '../../api/http';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import {
  useAdminRegistrations,
  useExportAdminRegistrationsCsv,
} from '../../hooks/admin/useAdminRegistrations';

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminRegistrationsPage() {
  const { activityId } = useParams();
  const query = useAdminRegistrations(activityId);
  const exportMutation = useExportAdminRegistrationsCsv(activityId);

  const items = query.data?.items ?? [];

  const error = query.error ?? exportMutation.error;
  const errorMessage = error ? (isApiError(error) ? error.message : 'Unknown error') : null;

  const exportFilename = useMemo(() => {
    const id = activityId ?? 'activity';
    return `registrations-${id}.csv`;
  }, [activityId]);

  if (!activityId) {
    return <ErrorState message="缺少 activityId" />;
  }

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.isError) {
    const message = isApiError(query.error) ? query.error.message : 'Unknown error';
    return <ErrorState message={message} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">報名名單</h1>
          <div className="text-sm text-slate-600">Activity ID: {activityId}</div>
        </div>

        <div className="flex items-center gap-2">
          <Link className="rounded border px-3 py-1 text-sm" to="/admin/activities">
            返回管理列表
          </Link>
          <button
            type="button"
            className="rounded border bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={exportMutation.isPending}
            onClick={() => {
              exportMutation.mutate(createIdempotencyKey('export'), {
                onSuccess: (csv) => downloadCsv(exportFilename, csv),
              });
            }}
          >
            {exportMutation.isPending ? '匯出中…' : '匯出 CSV'}
          </button>
        </div>
      </div>

      {errorMessage ? <div className="text-sm text-red-700">{errorMessage}</div> : null}

      {items.length === 0 ? (
        <EmptyState message="目前沒有報名資料" />
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-3 py-2">姓名</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">報名時間</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={`${r.email}-${r.registeredAt}`} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.email}</td>
                  <td className="px-3 py-2">{r.registeredAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
