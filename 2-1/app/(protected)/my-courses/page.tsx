'use client';

import { useQuery } from '@tanstack/react-query';

import MyCourseCard from '@/components/MyCourseCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { copy } from '@/lib/copy';
import { queryKeys } from '@/lib/queryKeys';
import { myCoursesClient } from '@/services/myCoursesClient';

export default function MyCoursesPage() {
  const q = useQuery({ queryKey: queryKeys.myCourses(), queryFn: myCoursesClient.listMyCourses });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any).message ?? copy.errors.loadFailed} />;
  if (!q.data) return null;

  if (q.data.courses.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">我的課程</h1>
        <div className="mt-6">
          <EmptyState title="尚無課程" description="先到課程列表瀏覽並購買課程。" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">我的課程</h1>
      <div className="mt-6 grid gap-4">
        {q.data.courses.map((c) => (
          <MyCourseCard
            key={c.courseId}
            courseId={c.courseId}
            title={c.title}
            description={c.description}
            price={c.price}
            progress={c.progress}
          />
        ))}
      </div>
    </div>
  );
}
