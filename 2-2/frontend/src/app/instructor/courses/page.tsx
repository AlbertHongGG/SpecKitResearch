'use client';

import Link from 'next/link';
import { RoleGuard } from '../../../components/role-guard';
import { useInstructorCourses } from '../../../features/instructor/api';
import { LoadingState, EmptyState, ErrorState } from '../../../features/courses/components/states';

export default function InstructorCoursesPage() {
  const { data, isLoading, error } = useInstructorCourses();

  return (
    <RoleGuard roles={['instructor', 'admin']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">教師課程管理</h1>
          <Link href="/instructor/courses/new" className="text-blue-600">
            新增課程
          </Link>
        </div>
        {isLoading && <LoadingState />}
        {error && <ErrorState message="載入失敗" />}
        {!isLoading && data?.items?.length === 0 && <EmptyState message="尚未建立課程" />}
        <div className="space-y-3">
          {data?.items?.map((course: any) => (
            <div key={course.id} className="rounded border bg-white p-4">
              <h2 className="font-semibold">{course.title}</h2>
              <p className="text-sm text-slate-600">狀態：{course.status}</p>
              <div className="space-x-3 text-sm">
                <Link href={`/instructor/courses/${course.id}/edit`} className="text-blue-600">
                  編輯
                </Link>
                <Link href={`/instructor/courses/${course.id}/curriculum`} className="text-blue-600">
                  課綱
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
