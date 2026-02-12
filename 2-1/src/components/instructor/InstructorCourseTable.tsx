'use client';

import { CoursePublishToggle } from '@/components/instructor/CoursePublishToggle';
import type { InstructorCourse } from '@/services/instructorClient';

export function InstructorCourseTable({ courses }: { courses: InstructorCourse[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-700">
            <th className="py-2 pr-4">標題</th>
            <th className="py-2 pr-4">狀態</th>
            <th className="py-2 pr-4">操作</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-2 pr-4">
                <div className="font-medium text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-500">{c.id}</div>
              </td>
              <td className="py-2 pr-4">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{c.status}</span>
              </td>
              <td className="py-2 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <a className="rounded-md border border-slate-300 px-2 py-1" href={`/instructor/courses/${c.id}/edit`}>
                    編輯
                  </a>
                  <a
                    className="rounded-md border border-slate-300 px-2 py-1"
                    href={`/instructor/courses/${c.id}/curriculum`}
                  >
                    課綱
                  </a>
                  <a className="rounded-md border border-slate-300 px-2 py-1" href={`/instructor/courses/${c.id}/submit`}>
                    送審
                  </a>
                  <CoursePublishToggle courseId={c.id} status={c.status} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
