'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { apiFetch, ApiError } from '../../../src/ui/lib/apiClient';
import { ErrorState, LoadingState, EmptyState } from '../../../src/ui/components/States';

type MyCourse = {
  id: string;
  title: string;
  price: number;
  coverImageUrl: string | null;
  status: string;
  category: { id: string; name: string };
  instructor: { id: string; email: string };
  progress: { completedLessons: number; totalLessons: number };
};

type MyCoursesResponse = { courses: MyCourse[] };

export default function MyCoursesPage() {
  const q = useQuery({
    queryKey: ['my-courses'],
    queryFn: () => apiFetch<MyCoursesResponse>('/api/my-courses'),
    retry: false,
  });

  if (q.isLoading)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <LoadingState />
      </main>
    );
  if (q.isError) {
    const err = q.error;
    if (err instanceof ApiError && err.status === 401) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <ErrorState message="需要登入才能查看" />
          <div className="mt-4">
            <Link href="/login" className="text-sm underline">
              前往登入
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState
          message={err instanceof Error ? err.message : '載入失敗'}
          onRetry={() => q.refetch()}
        />
      </main>
    );
  }

  const courses = q.data?.courses ?? [];

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold">我的課程</h1>
      {courses.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="尚未購買任何課程" description="到課程列表看看" />
          <div className="mt-3">
            <Link href="/courses" className="text-sm underline">
              去課程列表
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/my-courses/${c.id}`}
              className="block rounded border border-slate-200 p-4"
            >
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="mt-1 text-sm text-slate-600">
                進度：{c.progress.completedLessons}/{c.progress.totalLessons}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
