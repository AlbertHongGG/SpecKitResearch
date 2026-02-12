'use client';

import Link from 'next/link';
import { RouteGuard } from '../../components/route-guard';
import { useMyCourses } from '../../features/courses/api';
import { LoadingState, EmptyState, ErrorState } from '../../features/courses/components/states';

export default function MyCoursesPage() {
  const { data, isLoading, error } = useMyCourses();

  return (
    <RouteGuard>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">我的課程</h1>
        {isLoading && <LoadingState />}
        {error && <ErrorState message="載入失敗" />}
        {!isLoading && data?.items?.length === 0 && <EmptyState message="尚未購買課程" />}
        <div className="grid gap-4">
          {data?.items?.map((item: any) => (
            <div key={item.course.id} className="rounded border bg-white p-4">
              <h2 className="font-semibold">{item.course.title}</h2>
              <p className="text-sm text-slate-600">
                進度：{item.progress.completedLessons}/{item.progress.totalLessons}
              </p>
              <Link href={`/my-courses/${item.course.id}`} className="text-blue-600">
                進入閱讀
              </Link>
            </div>
          ))}
        </div>
      </div>
    </RouteGuard>
  );
}
