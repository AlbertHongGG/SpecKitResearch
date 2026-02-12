import { useNavigate } from 'react-router-dom';

import { useMyPendingReviewTasks } from '../services/reviews';
import { LoadingState, ErrorState, EmptyState } from '../ui/states';
import { StatusBadge } from '../components/StatusBadge';
import { SafeText } from '../components/SafeText';

export function ReviewsPage() {
  const nav = useNavigate();
  const tasks = useMyPendingReviewTasks();

  if (tasks.isLoading) return <LoadingState />;
  if (tasks.isError) return <ErrorState title="載入失敗">無法取得待辦清單。</ErrorState>;

  const items = tasks.data ?? [];
  if (items.length === 0) {
    return <EmptyState title="沒有待辦">目前沒有需要你處理的審核任務。</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">待辦</h1>
        <div className="mt-1 text-sm text-slate-600">只顯示你被指派且尚未處理的任務。</div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-200">
          {items.map((t) => (
            <li key={t.id}>
              <button
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() => nav(`/documents/${t.documentId}`)}
                type="button"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">
                    <SafeText value={t.document.title} />
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    Step：{t.stepKey} · {t.mode} · 建立：{new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={t.document.status} />
                  <span className="text-xs text-slate-500">開啟</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
