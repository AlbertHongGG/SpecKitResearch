'use client';

import { useQuery } from '@tanstack/react-query';

import { ReviewQueueTable } from '@/components/admin/ReviewQueueTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { copy } from '@/lib/copy';
import { queryKeys } from '@/lib/queryKeys';
import { adminClient } from '@/services/adminClient';

export default function AdminReviewsPage() {
  const q = useQuery({ queryKey: queryKeys.reviewQueue(), queryFn: adminClient.reviewQueue });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any)?.message ?? copy.errors.loadFailed} />;
  if (!q.data) return <Loading />;

  if (q.data.courses.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">待審課程</h1>
        <div className="mt-6">
          <EmptyState title="目前沒有待審課程" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">待審課程</h1>
      <div className="mt-6">
        <ReviewQueueTable courses={q.data.courses} />
      </div>
    </div>
  );
}
