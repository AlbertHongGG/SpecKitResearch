'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  createLesson,
  createSection,
  getCurriculum,
  reorderLessons,
  reorderSections,
  type Curriculum,
  type CurriculumSection,
} from '../../services/instructor';
import { isApiError } from '../../services/api-client';

export function CurriculumEditor({ courseId, locked }: { courseId: string; locked: boolean }) {
  const [data, setData] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const sections = useMemo(
    () => (data?.sections ?? []).slice().sort((a, b) => a.position - b.position),
    [data],
  );

  async function refresh() {
    const res = await getCurriculum(courseId);
    setData(res);
  }

  useEffect(() => {
    refresh().catch((e) => {
      if (isApiError(e)) setError(e.message);
      else setError('讀取失敗');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="text-sm font-semibold">課綱編輯</div>
      {locked ? <Alert variant="info">課程已提交審核（submitted），目前鎖定不可修改。</Alert> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (locked) return;
          setError(null);
          try {
            await createSection(courseId, { title: newSectionTitle });
            setNewSectionTitle('');
            await refresh();
          } catch (e2) {
            if (isApiError(e2)) setError(e2.message);
            else setError('新增章節失敗');
          }
        }}
      >
        <div className="flex-1">
          <Input label="新增章節" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} />
        </div>
        <Button type="submit" disabled={locked}>
          新增
        </Button>
      </form>

      <div className="space-y-3">
        {sections.map((s: CurriculumSection, idx: number) => (
          <div key={s.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {idx + 1}. {s.title}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || idx === 0}
                  onClick={async () => {
                    const ids = sections.map((x: CurriculumSection) => x.id);
                    const tmp = ids[idx - 1];
                    ids[idx - 1] = ids[idx];
                    ids[idx] = tmp;
                    await reorderSections(courseId, ids);
                    await refresh();
                  }}
                >
                  上移
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked || idx === sections.length - 1}
                  onClick={async () => {
                    const ids = sections.map((x: CurriculumSection) => x.id);
                    const tmp = ids[idx + 1];
                    ids[idx + 1] = ids[idx];
                    ids[idx] = tmp;
                    await reorderSections(courseId, ids);
                    await refresh();
                  }}
                >
                  下移
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-xs font-semibold text-gray-600">單元</div>
              <ul className="space-y-1 text-sm">
                {s.lessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between">
                    <span>
                      {l.position}. {l.title}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="outline"
                disabled={locked}
                onClick={async () => {
                  const title = window.prompt('單元標題');
                  if (!title) return;
                  await createLesson(s.id, { title, contentType: 'text', contentText: '' });
                  await refresh();
                }}
              >
                新增單元（文字）
              </Button>

              {s.lessons.length >= 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={locked}
                  onClick={async () => {
                    const ids = s.lessons.map((x) => x.id).reverse();
                    await reorderLessons(s.id, ids);
                    await refresh();
                  }}
                >
                  反轉單元順序（示範）
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
