'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';

export function CurriculumEditor({ courseId, course }: { courseId: string; course: any }) {
  const qc = useQueryClient();

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.instructorCourse(courseId) });
  };

  const createSection = useMutation({
    mutationFn: async () => {
      const title = window.prompt('章節標題')?.trim();
      if (!title) throw new Error('取消');
      const nextOrder = (course.sections?.length ?? 0) + 1;
      return instructorClient.createSection(courseId, { title, order: nextOrder });
    },
    onSuccess: invalidate,
  });

  const createLesson = useMutation({
    mutationFn: async (sectionId: string) => {
      const title = window.prompt('單元標題')?.trim();
      if (!title) throw new Error('取消');
      const contentType = (window.prompt('contentType: text|image|pdf', 'text') ?? 'text').trim();
      const order = Number(window.prompt('order', '1') ?? '1');

      if (!['text', 'image', 'pdf'].includes(contentType)) throw new Error('contentType 不合法');

      let contentText: string | null = null;
      let contentImageFileId: string | null = null;
      let contentPdfFileId: string | null = null;

      if (contentType === 'text') {
        contentText = window.prompt('內容（text）') ?? '';
      }

      if (contentType === 'image') {
        contentImageFileId = window.prompt('請先上傳圖片，貼上 fileId') ?? '';
      }

      if (contentType === 'pdf') {
        contentPdfFileId = window.prompt('請先上傳 PDF，貼上 fileId') ?? '';
      }

      return instructorClient.createLesson(sectionId, {
        title,
        order,
        contentType,
        contentText,
        contentImageFileId,
        contentPdfFileId,
      });
    },
    onSuccess: invalidate,
  });

  const updateSection = useMutation({
    mutationFn: async (sectionId: string) => {
      const title = window.prompt('新標題（空白取消）')?.trim();
      if (!title) throw new Error('取消');
      return instructorClient.updateSection(sectionId, { title });
    },
    onSuccess: invalidate,
  });

  const deleteSection = useMutation({
    mutationFn: (sectionId: string) => instructorClient.deleteSection(sectionId),
    onSuccess: invalidate,
  });

  const deleteLesson = useMutation({
    mutationFn: (lessonId: string) => instructorClient.deleteLesson(lessonId),
    onSuccess: invalidate,
  });

  const reorderSections = useMutation({
    mutationFn: (sections: Array<{ sectionId: string; order: number }>) =>
      instructorClient.reorderSections(courseId, { sections }),
    onSuccess: invalidate,
  });

  const reorderLessons = useMutation({
    mutationFn: ({ sectionId, lessons }: { sectionId: string; lessons: Array<{ lessonId: string; order: number }> }) =>
      instructorClient.reorderLessons(sectionId, { lessons }),
    onSuccess: invalidate,
  });

  const sortedSections = [...(course.sections ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  const moveSection = (sectionId: string, dir: -1 | 1) => {
    const idx = sortedSections.findIndex((s: any) => s.id === sectionId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sortedSections.length) return;

    const next = [...sortedSections];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;

    reorderSections.mutate(next.map((s: any, i: number) => ({ sectionId: s.id, order: i + 1 })));
  };

  const moveLesson = (section: any, lessonId: string, dir: -1 | 1) => {
    const lessons = [...(section.lessons ?? [])].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    const idx = lessons.findIndex((l: any) => l.id === lessonId);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= lessons.length) return;

    const next = [...lessons];
    const tmp = next[idx];
    next[idx] = next[j];
    next[j] = tmp;

    reorderLessons.mutate({
      sectionId: section.id,
      lessons: next.map((l: any, i: number) => ({ lessonId: l.id, order: i + 1 })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">課綱</h2>
        <Button type="button" onClick={() => createSection.mutate()} disabled={createSection.isPending}>
          新增章節
        </Button>
      </div>

      {createSection.isError ? <InlineError message={(createSection.error as any)?.message ?? '新增失敗'} /> : null}

      <div className="space-y-4">
        {sortedSections.map((s: any) => (
          <div key={s.id} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-900">
                {s.order}. {s.title}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="bg-slate-700 hover:bg-slate-600"
                  onClick={() => moveSection(s.id, -1)}
                  disabled={reorderSections.isPending}
                >
                  上移
                </Button>
                <Button
                  type="button"
                  className="bg-slate-700 hover:bg-slate-600"
                  onClick={() => moveSection(s.id, 1)}
                  disabled={reorderSections.isPending}
                >
                  下移
                </Button>
                <Button
                  type="button"
                  className="bg-slate-700 hover:bg-slate-600"
                  onClick={() => updateSection.mutate(s.id)}
                  disabled={updateSection.isPending}
                >
                  改標題
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-500"
                  onClick={() => {
                    if (window.confirm('確定刪除章節？會連同單元刪除。')) deleteSection.mutate(s.id);
                  }}
                  disabled={deleteSection.isPending}
                >
                  刪除
                </Button>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-slate-700">單元</div>
              <Button type="button" onClick={() => createLesson.mutate(s.id)} disabled={createLesson.isPending}>
                新增單元
              </Button>
            </div>

            <ul className="mt-2 space-y-2">
              {[...(s.lessons ?? [])]
                .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
                .map((l: any) => (
                <li key={l.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-2">
                  <div className="text-sm">
                    {l.order}. {l.title} <span className="text-xs text-slate-500">({l.contentType})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      className="bg-slate-700 hover:bg-slate-600"
                      onClick={() => moveLesson(s, l.id, -1)}
                      disabled={reorderLessons.isPending}
                    >
                      上移
                    </Button>
                    <Button
                      type="button"
                      className="bg-slate-700 hover:bg-slate-600"
                      onClick={() => moveLesson(s, l.id, 1)}
                      disabled={reorderLessons.isPending}
                    >
                      下移
                    </Button>
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-500"
                      onClick={() => {
                        if (window.confirm('確定刪除單元？')) deleteLesson.mutate(l.id);
                      }}
                      disabled={deleteLesson.isPending}
                    >
                      刪除
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
