'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch, ApiError } from '../../../../src/ui/lib/apiClient';
import { ErrorState, LoadingState } from '../../../../src/ui/components/States';
import { Reader, type ReaderSection } from '../../../../src/ui/components/reader/Reader';

type ReaderResponse = {
  course: { id: string; title: string };
  sections: ReaderSection[];
};

export default function CourseReaderPage() {
  const params = useParams<{ courseId: string | string[] }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  const q = useQuery({
    queryKey: ['reader', courseId],
    queryFn: () => apiFetch<ReaderResponse>(`/api/my-courses/${courseId}`),
    retry: false,
    enabled: Boolean(courseId),
  });

  if (!courseId) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState message="無效的課程 ID" />
      </main>
    );
  }

  if (q.isLoading) return <main className="mx-auto max-w-5xl p-6"><LoadingState /></main>;
  if (q.isError) {
    const err = q.error;
    if (err instanceof ApiError && err.status === 401) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <ErrorState message="需要登入才能閱讀" />
          <div className="mt-4">
            <Link href="/login" className="text-sm underline">前往登入</Link>
          </div>
        </main>
      );
    }

    if (err instanceof ApiError && err.status === 403) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <ErrorState message="你沒有權限閱讀此課程（可能尚未購買）" />
          <div className="mt-4">
            <Link href={`/courses/${courseId}`} className="text-sm underline">回到課程詳情</Link>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState message={err instanceof Error ? err.message : '載入失敗'} onRetry={() => q.refetch()} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <Link href="/my-courses" className="text-sm underline">← 回我的課程</Link>
      </div>
      <h1 className="text-xl font-semibold">{q.data!.course.title}</h1>
      <div className="mt-4">
        <Reader courseId={q.data!.course.id} sections={q.data!.sections} />
      </div>
    </main>
  );
}
