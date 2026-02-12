'use client';

import { RoleGuard } from '../../../components/role-guard';
import { useAdminCourses, useArchiveCourse, usePublishCourse } from '../../../features/admin/api';
import { LoadingState, ErrorState, EmptyState } from '../../../features/courses/components/states';

function CourseRow({ course }: { course: any }) {
  const archive = useArchiveCourse(course.id);
  const publish = usePublishCourse(course.id);
  return (
    <div className="rounded border bg-white p-4">
      <div className="font-semibold">{course.title}</div>
      <div className="text-sm text-slate-600">狀態：{course.status}</div>
      <div className="space-x-2">
        <button
          className="rounded bg-gray-700 px-3 py-1 text-white"
          onClick={() => archive.mutate()}
        >
          下架
        </button>
        <button
          className="rounded bg-green-600 px-3 py-1 text-white"
          onClick={() => publish.mutate()}
        >
          上架
        </button>
      </div>
    </div>
  );
}

export default function AdminCoursesPage() {
  const { data, isLoading, error } = useAdminCourses();

  return (
    <RoleGuard roles={['admin']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">課程管理</h1>
        {isLoading && <LoadingState />}
        {error && <ErrorState message="載入失敗" />}
        {data?.items?.length === 0 && <EmptyState message="尚無課程" />}
        <div className="space-y-2">
          {data?.items?.map((course: any) => (
            <CourseRow key={course.id} course={course} />
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
