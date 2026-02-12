'use client';

import Link from 'next/link';
import { useCourses } from '../../features/courses/api';
import { LoadingState, EmptyState, ErrorState } from '../../features/courses/components/states';

export default function CoursesPage() {
  const { data, isLoading, error } = useCourses();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message="載入課程失敗" />;
  if (!data || data.items.length === 0) return <EmptyState message="目前沒有課程" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">課程列表</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {data.items.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="rounded border bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">{course.title}</h2>
            <p className="text-sm text-slate-600">{course.description}</p>
            <p className="mt-2 text-sm">價格：{course.price}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
