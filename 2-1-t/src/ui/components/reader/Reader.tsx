'use client';

import { useMemo, useState } from 'react';

import { Button } from '../Button';
import { apiFetch } from '../../lib/apiClient';

export type ReaderLesson = {
  id: string;
  title: string;
  order: number;
  contentType: 'text' | 'image' | 'pdf';
  contentText: string | null;
  contentImageUrl: string | null;
  contentFileUrl: string | null;
  contentFileName: string | null;
  isCompleted: boolean;
};

export type ReaderSection = {
  id: string;
  title: string;
  order: number;
  lessons: ReaderLesson[];
};

export function Reader(params: { courseId: string; sections: ReaderSection[] }) {
  const allLessons = useMemo(() => params.sections.flatMap((s) => s.lessons), [params.sections]);
  const [activeLessonId, setActiveLessonId] = useState(allLessons[0]?.id ?? null);

  const activeLesson = allLessons.find((l) => l.id === activeLessonId) ?? null;

  async function toggleComplete(next: boolean) {
    if (!activeLesson) return;
    await apiFetch(`/api/lessons/${activeLesson.id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ isCompleted: next }),
    });
    // page-level refetch handles state; keep simple
    window.location.reload();
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        {params.sections.map((s) => (
          <div key={s.id} className="rounded border border-slate-200 p-3">
            <div className="text-sm font-medium">
              {s.order}. {s.title}
            </div>
            <div className="mt-2 space-y-1">
              {s.lessons.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={
                    'block w-full rounded px-2 py-1 text-left text-sm ' +
                    (l.id === activeLessonId
                      ? 'bg-slate-900 text-white'
                      : 'hover:bg-slate-50')
                  }
                  onClick={() => setActiveLessonId(l.id)}
                >
                  {l.isCompleted ? '✓ ' : ''}
                  {l.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <section className="rounded border border-slate-200 p-4">
        {activeLesson ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{activeLesson.title}</div>
                <div className="mt-1 text-xs text-slate-600">{activeLesson.contentType}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={activeLesson.isCompleted}
                  onClick={() => toggleComplete(true)}
                >
                  標記完成
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!activeLesson.isCompleted}
                  onClick={() => toggleComplete(false)}
                >
                  取消完成
                </Button>
              </div>
            </div>

            <div className="mt-4">
              {activeLesson.contentType === 'text' ? (
                <div className="whitespace-pre-wrap text-sm">{activeLesson.contentText}</div>
              ) : null}

              {activeLesson.contentType === 'image' && activeLesson.contentImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeLesson.contentImageUrl} alt={activeLesson.title} className="max-w-full" />
              ) : null}

              {activeLesson.contentType === 'pdf' && activeLesson.contentFileUrl ? (
                <a
                  href={activeLesson.contentFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline"
                >
                  開啟 PDF：{activeLesson.contentFileName ?? 'download'}
                </a>
              ) : null}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-600">沒有可閱讀的單元</div>
        )}
      </section>
    </div>
  );
}
