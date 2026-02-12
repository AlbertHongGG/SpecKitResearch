'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../src/ui/lib/apiClient';
import { CourseCard, type CourseCardModel } from '../../../src/ui/components/course/CourseCard';
import { ErrorState, LoadingState, EmptyState } from '../../../src/ui/components/States';

type CoursesResponse = { courses: CourseCardModel[] };

export default function CoursesListPage() {
  const q = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiFetch<CoursesResponse>('/api/courses'),
  });

  if (q.isLoading)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <LoadingState />
      </main>
    );
  if (q.isError) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState
          message={q.error instanceof Error ? q.error.message : '載入失敗'}
          onRetry={() => q.refetch()}
        />
      </main>
    );
  }

  const courses = q.data?.courses ?? [];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold">課程</h1>
      {courses.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="目前沒有課程" description="請稍後再試" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {courses.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </main>
  );
}
