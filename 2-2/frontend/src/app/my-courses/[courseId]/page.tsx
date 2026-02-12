'use client';

import { useState } from 'react';
import { RouteGuard } from '../../../components/route-guard';
import { useCourseReader } from '../../../features/courses/api';
import { useMarkProgress } from '../../../features/progress/api';
import { LoadingState, ErrorState } from '../../../features/courses/components/states';
import { LessonContent } from '../../../features/courses/components/lesson-content';

export default function CourseReaderPage({ params }: { params: { courseId: string } }) {
  const { data, isLoading, error } = useCourseReader(params.courseId);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="載入失敗" />;

  const sections = data.sections ?? [];
  const allLessons = sections.flatMap((section: any) => section.lessons ?? []);
  const activeLesson =
    allLessons.find((lesson: any) => lesson.id === activeLessonId) ?? allLessons[0];

  const progress = useMarkProgress(params.courseId, activeLesson?.id ?? '');

  return (
    <RouteGuard>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <h2 className="text-lg font-semibold">課程內容</h2>
          {sections.map((section: any) => (
            <div key={section.id}>
              <div className="font-medium">{section.title}</div>
              <ul className="ml-3 list-disc text-sm text-slate-600">
                {section.lessons?.map((lesson: any) => (
                  <li key={lesson.id}>
                    <button
                      className="text-left text-blue-600"
                      onClick={() => setActiveLessonId(lesson.id)}
                    >
                      {lesson.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold">{activeLesson?.title}</h1>
          {activeLesson && <LessonContent lesson={activeLesson} />}
          {activeLesson && (
            <button
              className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
              onClick={() => progress.mutate(true)}
              disabled={progress.isPending}
            >
              標記完成
            </button>
          )}
        </section>
      </div>
    </RouteGuard>
  );
}
