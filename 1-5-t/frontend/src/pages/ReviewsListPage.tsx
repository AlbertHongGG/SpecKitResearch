import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReviewTaskListItem } from '@internal/contracts';
import { reviewsApi } from '../api/reviews';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/status/ErrorState';
import { EmptyState } from '../components/status/EmptyState';

export function ReviewsListPage() {
  const query = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: () => reviewsApi.listMyPending(),
  });

  const refresh = useMutation({
    mutationFn: async () => query.refetch(),
  });

  if (query.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState title="載入待辦失敗" error={query.error} />;
  }

  const items: ReviewTaskListItem[] = query.data?.tasks ?? [];
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">我的待辦</h1>
        <Button variant="secondary" loading={refresh.isPending} onClick={() => refresh.mutate()}>
          重新整理
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="目前沒有待辦" description="有新的送審任務時會出現在這裡。" />
      ) : (
        <div className="mt-4 divide-y rounded-lg border border-slate-200 bg-white">
          {items.map((t) => (
            <div key={t.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{t.documentTitle}</div>
                <div className="text-xs text-slate-500">
                  {t.stepKey} · {t.mode} · {t.status} · {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>
              <Link className="text-sm text-slate-900 underline" to={`/documents/${t.documentId}`}>
                開啟文件
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
