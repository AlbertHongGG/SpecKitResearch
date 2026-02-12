'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { InstructorCourseTable } from '@/components/instructor/InstructorCourseTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { copy } from '@/lib/copy';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';

export default function InstructorCoursesPage() {
  const q = useQuery({ queryKey: queryKeys.instructorCourses(), queryFn: instructorClient.listCourses });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any)?.message ?? copy.errors.loadFailed} />;
  if (!q.data) return <Loading />;

  if (q.data.courses.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">教師課程</h1>
          <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href="/instructor/courses/new">
            新增課程
          </Link>
        </div>
        <div className="mt-6">
          <EmptyState title="尚無課程" description="建立你的第一門課程並開始編排內容。" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">教師課程</h1>
        <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white" href="/instructor/courses/new">
          新增課程
        </Link>
      </div>
      <div className="mt-6">
        <InstructorCourseTable courses={q.data.courses} />
      </div>
    </div>
  );
}
