'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../src/ui/lib/apiClient';
import { ErrorState, LoadingState, EmptyState } from '../../../src/ui/components/States';
import { ReviewDecisionDialog } from '../../../src/ui/components/admin/ReviewDecisionDialog';

type PendingCourse = {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImageUrl: string | null;
  status: string;
  category: { id: string; name: string };
  instructor: { id: string; email: string };
  tags: { id: string; name: string }[];
};

type Resp = { courses: PendingCourse[] };

export default function AdminReviewPage() {
  const q = useQuery({
    queryKey: ['admin-pending-reviews'],
    queryFn: () => apiFetch<Resp>('/api/admin/reviews/pending'),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError)
    return <ErrorState message={q.error instanceof Error ? q.error.message : '載入失敗'} onRetry={() => q.refetch()} />;

  const courses = q.data?.courses ?? [];
  if (courses.length === 0) {
    return <EmptyState title="目前沒有待審課程" description="submitted 的課程會出現在這裡" />;
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">待審課程</h1>
      <div className="mt-4 space-y-3">
        {courses.map((c) => (
          <div key={c.id} className="rounded border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{c.title}</div>
                <div className="mt-1 text-xs text-slate-600">講師：{c.instructor.email}</div>
                <div className="mt-1 text-xs text-slate-600">分類：{c.category.name}</div>
                <div className="mt-1 text-xs text-slate-600">價格：{c.price}</div>
                <div className="mt-2 text-xs text-slate-600 line-clamp-3">{c.description}</div>
                {c.tags.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {c.tags.map((t) => (
                      <span key={t.id} className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {t.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <ReviewDecisionDialog courseId={c.id} courseTitle={c.title} onDone={() => void q.refetch()} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
