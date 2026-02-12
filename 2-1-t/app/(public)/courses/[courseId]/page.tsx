'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch, ApiError } from '../../../../src/ui/lib/apiClient';
import { Button } from '../../../../src/ui/components/Button';
import { CourseOutline, type CourseOutlineSection } from '../../../../src/ui/components/course/CourseOutline';
import { ErrorState, LoadingState } from '../../../../src/ui/components/States';

type CourseDetailResponse = {
  course: {
    id: string;
    title: string;
    description: string;
    price: number;
    coverImageUrl: string | null;
    status: string;
    category: { id: string; name: string };
    tags: { id: string; name: string }[];
    instructor: { id: string; email: string };
  };
  outline: CourseOutlineSection[];
  viewerFlags: { isAuthenticated: boolean; role: string | null; isAuthor: boolean; isPurchased: boolean };
};

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string | string[] }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  const q = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => apiFetch<CourseDetailResponse>(`/api/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  async function purchase() {
    if (!q.data) return;
    if (!q.data.viewerFlags.isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(`/courses/${courseId}`)}`);
      return;
    }
    await apiFetch('/api/purchases', { method: 'POST', body: JSON.stringify({ courseId: q.data.course.id }) });
    await q.refetch();
    router.refresh();
  }

  if (q.isLoading) return <main className="mx-auto max-w-5xl p-6"><LoadingState /></main>;
  if (q.isError) {
    const err = q.error;
    if (err instanceof ApiError && err.status === 404) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <ErrorState message="找不到課程" />
        </main>
      );
    }
    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState message={err instanceof Error ? err.message : '載入失敗'} onRetry={() => q.refetch()} />
      </main>
    );
  }

  if (!courseId) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState message="無效的課程 ID" />
      </main>
    );
  }

  const data = q.data!;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{data.course.title}</h1>
          <div className="mt-1 text-sm text-slate-600">{data.course.category.name}</div>
          <div className="mt-2 text-sm">NT$ {data.course.price}</div>
        </div>

        <Button type="button" onClick={purchase} disabled={data.viewerFlags.isPurchased}>
          {data.viewerFlags.isPurchased ? '已購買' : '購買'}
        </Button>
      </div>

      <div className="mt-4 text-sm text-slate-700">{data.course.description}</div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold">課綱</h2>
        <div className="mt-2">
          <CourseOutline outline={data.outline} />
        </div>
      </div>
    </main>
  );
}
