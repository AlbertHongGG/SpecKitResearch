'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import Outline from '@/components/Outline';
import PurchaseButton from '@/components/PurchaseButton';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { formatMoneyTWD } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import { coursesClient } from '@/services/coursesClient';

export default function CourseDetailPage() {
  const { courseId } = useParams() as { courseId: string };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.courseDetail(courseId),
    queryFn: () => coursesClient.detail(courseId),
  });

  if (isLoading) return <Loading />;
  if (isError) return <InlineError message={(error as any).message ?? '載入失敗'} />;
  if (!data) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">{data.course.title}</h1>
      <p className="mt-2 text-slate-700">{data.course.description}</p>
      <p className="mt-4 text-sm font-semibold text-slate-900">{formatMoneyTWD(data.course.price)}</p>

      <div className="mt-6">
        <PurchaseButton courseId={data.course.courseId} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">課綱</h2>
      <div className="mt-4">
        <Outline
          outline={data.outline.map((s) => ({
            sectionId: s.sectionId,
            title: s.title,
            lessons: s.lessons.map((l) => ({ lessonId: l.lessonId, title: l.title })),
          }))}
        />
      </div>
    </div>
  );
}
