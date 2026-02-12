'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../../../src/ui/lib/apiClient';
import { Button } from '../../../../../src/ui/components/Button';
import { ErrorState, LoadingState, EmptyState } from '../../../../../src/ui/components/States';
import { SectionEditor, type InstructorSection } from '../../../../../src/ui/components/instructor/SectionEditor';

type SectionsResp = { sections: InstructorSection[] };

type CourseResp = { course: { id: string; status: string; title: string } };

export default function CurriculumPage() {
  const params = useParams<{ courseId: string | string[] }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  const q = useQuery({
    queryKey: ['instructor-curriculum', courseId],
    queryFn: () => apiFetch<SectionsResp>(`/api/instructor/courses/${courseId}/sections`),
    enabled: Boolean(courseId),
  });

  const courseQ = useQuery({
    queryKey: ['instructor-course', courseId],
    queryFn: () => apiFetch<CourseResp>(`/api/instructor/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  async function addSection() {
    await apiFetch(`/api/instructor/courses/${courseId}/sections`, {
      method: 'POST',
      body: JSON.stringify({ title: 'New Section' }),
    });
    window.location.reload();
  }

  if (!courseId) return <main className="mx-auto max-w-5xl p-6"><ErrorState message="無效的課程 ID" /></main>;
  if (q.isLoading || courseQ.isLoading) return <main className="mx-auto max-w-5xl p-6"><LoadingState /></main>;
  if (q.isError) return <main className="mx-auto max-w-5xl p-6"><ErrorState message={q.error instanceof Error ? q.error.message : '載入失敗'} onRetry={() => q.refetch()} /></main>;
  if (courseQ.isError) return <main className="mx-auto max-w-5xl p-6"><ErrorState message={courseQ.error instanceof Error ? courseQ.error.message : '載入失敗'} onRetry={() => courseQ.refetch()} /></main>;

  const sections = q.data?.sections ?? [];
  const course = courseQ.data?.course;
  const isReadOnly = course?.status === 'submitted';

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <Link href={`/instructor/courses/${courseId}`} className="text-sm underline">
          ← 回課程編輯
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold">課綱編輯{course?.title ? `：${course.title}` : ''}</h1>
        <Button type="button" disabled={isReadOnly} onClick={() => void addSection()}>
          + 新增章節
        </Button>
      </div>

      {isReadOnly ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          本課程目前為「送審中」。你仍可檢視課綱，但不可新增/刪除/調整章節與單元。
        </div>
      ) : null}

      {sections.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="尚無章節" description="先新增章節" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {sections.map((s) => (
            <SectionEditor key={s.id} courseId={courseId} section={s} readOnly={isReadOnly} />
          ))}
        </div>
      )}
    </main>
  );
}
