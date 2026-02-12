'use client';

import Link from 'next/link';
import { useCourseDetail, usePurchaseCourse, useMyCourses } from '../../../features/courses/api';
import { useSession } from '../../../features/auth/use-session';
import { LoadingState, ErrorState } from '../../../features/courses/components/states';

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const { user } = useSession();
  const { data, isLoading, error } = useCourseDetail(params.courseId);
  const myCourses = useMyCourses(!!user);
  const purchase = usePurchaseCourse(params.courseId);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="載入課程失敗" />;

  const purchased =
    myCourses.data?.items?.some((item: any) => item.course.id === params.courseId) ?? false;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{data.title}</h1>
      <p className="text-slate-600">{data.description}</p>
      <p>價格：{data.price}</p>
      <div className="space-x-2">
        {user && !purchased && (
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={() => purchase.mutate()}
            disabled={purchase.isPending}
          >
            購買課程
          </button>
        )}
        {user && purchased && (
          <Link href={`/my-courses/${params.courseId}`} className="text-blue-600">
            進入閱讀
          </Link>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">章節大綱</h2>
        {data.sections?.map((section: any) => (
          <div key={section.id} className="rounded border bg-white p-3">
            <div className="font-medium">{section.title}</div>
            <ul className="ml-4 list-disc text-sm text-slate-600">
              {section.lessons?.map((lesson: any) => (
                <li key={lesson.id}>{lesson.title}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
