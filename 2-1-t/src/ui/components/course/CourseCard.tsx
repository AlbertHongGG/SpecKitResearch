'use client';

import Link from 'next/link';

export type CourseCardModel = {
  id: string;
  title: string;
  price: number;
  coverImageUrl: string | null;
  category: { id: string; name: string };
  instructor: { id: string; email: string };
};

export function CourseCard({ course }: { course: CourseCardModel }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded border border-slate-200 p-4 hover:border-slate-300"
    >
      <div className="text-sm font-semibold">{course.title}</div>
      <div className="mt-1 text-sm text-slate-600">{course.category.name}</div>
      <div className="mt-2 text-sm">NT$ {course.price}</div>
    </Link>
  );
}
