'use client';

import { useState } from 'react';
import { RoleGuard } from '../../../components/role-guard';
import { useReviewQueue, useReviewCourse } from '../../../features/admin/api';
import { LoadingState, EmptyState, ErrorState } from '../../../features/courses/components/states';

export default function AdminReviewPage() {
  const { data, isLoading, error } = useReviewQueue();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const review = useReviewCourse(selected ?? '');

  return (
    <RoleGuard roles={['admin']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">待審課程</h1>
        {isLoading && <LoadingState />}
        {error && <ErrorState message="載入失敗" />}
        {!isLoading && data?.items?.length === 0 && <EmptyState message="沒有待審課程" />}
        <div className="space-y-2">
          {data?.items?.map((course: any) => (
            <div key={course.id} className="rounded border bg-white p-4">
              <div className="font-semibold">{course.title}</div>
              <button className="text-blue-600" onClick={() => setSelected(course.id)}>
                審核
              </button>
            </div>
          ))}
        </div>
        {selected && (
          <div className="rounded border bg-white p-4 space-y-2">
            <h2 className="font-medium">審核決策</h2>
            <textarea
              className="w-full rounded border px-3 py-2"
              placeholder="駁回理由"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <textarea
              className="w-full rounded border px-3 py-2"
              placeholder="核准備註"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="space-x-2">
              <button
                className="rounded bg-green-600 px-4 py-2 text-white"
                onClick={() => review.mutate({ decision: 'published', note })}
              >
                核准
              </button>
              <button
                className="rounded bg-red-600 px-4 py-2 text-white"
                onClick={() => review.mutate({ decision: 'rejected', reason })}
              >
                駁回
              </button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
