'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';

import LessonCompletionToggle from '@/components/LessonCompletionToggle';
import LessonContentViewer from '@/components/LessonContentViewer';
import LessonList from '@/components/LessonList';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { myCoursesClient } from '@/services/myCoursesClient';

export default function ReaderPage() {
  const { courseId } = useParams() as { courseId: string };

  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined);

  const q = useQuery({
    queryKey: queryKeys.reader(courseId, selectedLessonId),
    queryFn: () => myCoursesClient.getReaderData(courseId, selectedLessonId),
  });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any).message ?? '載入失敗'} />;

  const data = q.data;
  if (!data) return null;

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <aside>
        <h1 className="text-lg font-semibold text-slate-900">{data.course.title}</h1>
        <p className="mt-1 text-xs text-slate-500">講師：{data.course.instructor.email}</p>

        <div className="mt-4">
          <LessonList
            outline={data.outline.map((s) => ({
              sectionId: s.sectionId,
              title: s.title,
              lessons: s.lessons.map((l) => ({ lessonId: l.lessonId, title: l.title })),
            }))}
            completedLessonIds={data.completedLessonIds}
            selectedLessonId={data.lessonContent?.lessonId}
            onSelectLesson={(id) => setSelectedLessonId(id)}
          />
        </div>
      </aside>

      <section className="space-y-3">
        {data.lessonContent ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">單元</div>
            <LessonCompletionToggle
              courseId={courseId}
              lessonId={data.lessonContent.lessonId}
              isCompleted={data.lessonContent.isCompleted}
            />
          </div>
        ) : null}

        <LessonContentViewer
          lesson={
            data.lessonContent
              ? {
                  lessonId: data.lessonContent.lessonId,
                  title: data.lessonContent.title,
                  contentType: data.lessonContent.contentType,
                  contentText: data.lessonContent.contentText,
                  contentImageUrl: data.lessonContent.contentImageUrl,
                  contentFileUrl: data.lessonContent.contentFileUrl,
                }
              : null
          }
        />
      </section>
    </div>
  );
}
