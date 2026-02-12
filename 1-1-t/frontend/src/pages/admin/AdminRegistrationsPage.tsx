import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAdminRegistrations } from '../../api/hooks/useAdminRegistrations';
import { apiFetch } from '../../api/httpClient';
import { toToastError } from '../../api/errors';
import { RegistrationsTable } from '../../components/admin/RegistrationsTable';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Loading } from '../../components/feedback/Loading';
import { pushToast } from '../../components/feedback/toastStore';

export function AdminRegistrationsPage() {
  const params = useParams();
  const activityId = params.id ?? '';

  const [sp, setSp] = useSearchParams();
  const includeCancelled = sp.get('includeCancelled') === 'true';

  const { list } = useAdminRegistrations({ activityId, includeCancelled });

  const onToggleIncludeCancelled = (next: boolean) => {
    const nextParams = new URLSearchParams(sp);
    if (next) nextParams.set('includeCancelled', 'true');
    else nextParams.delete('includeCancelled');
    setSp(nextParams, { replace: true });
  };

  const onDownloadCsv = async () => {
    try {
      const csv = await apiFetch<string>(`/admin/activities/${activityId}/registrations.csv`);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${activityId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      pushToast({ type: 'error', ...toToastError(err, 'CSV 下載失敗') });
    }
  };

  if (!activityId) {
    return <ErrorState title="缺少活動 ID" />;
  }

  if (list.isLoading) return <Loading label="載入報名名單中…" />;
  if (list.isError) return <ErrorState error={list.error} title="載入失敗" />;

  const items = list.data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">後台：報名名單</h1>
          <p className="mt-1 text-sm text-gray-600">查看報名者並匯出 CSV（含 UTF-8 BOM）。</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin"
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
          >
            ← 回活動管理
          </Link>
          <button
            type="button"
            onClick={onDownloadCsv}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            下載 CSV
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <input
          id="includeCancelled"
          type="checkbox"
          className="h-4 w-4"
          checked={includeCancelled}
          onChange={(e) => onToggleIncludeCancelled(e.target.checked)}
        />
        <label htmlFor="includeCancelled" className="text-sm text-gray-700">
          包含已取消
        </label>
        <div className="ml-auto text-sm text-gray-600">共 {items.length} 筆</div>
      </div>

      <div className="mt-3">
        <RegistrationsTable items={items} />
      </div>
    </div>
  );
}
