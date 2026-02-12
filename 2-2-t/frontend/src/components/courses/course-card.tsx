import Link from 'next/link';
import type { CourseSummary } from '@app/contracts';

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link href={`/courses/${course.id}`} className="block rounded-lg border p-4 hover:bg-gray-50">
      <div className="text-base font-semibold">{course.title}</div>
      <div className="mt-1 line-clamp-2 text-sm text-gray-600">{course.description}</div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <div className="text-gray-700">講師：{course.instructor.email}</div>
        <div className="font-medium">NT$ {course.price}</div>
      </div>
    </Link>
  );
}
