'use client';

import { useState } from 'react';

import { Button } from '../Button';
import { Input } from '../Input';
import { apiFetch } from '../../lib/apiClient';
import { LessonEditor, type InstructorLesson } from './LessonEditor';

export type InstructorSection = {
  id: string;
  title: string;
  order: number;
  lessons: InstructorLesson[];
};

export function SectionEditor(params: {
  courseId: string;
  section: InstructorSection;
  readOnly?: boolean;
}) {
  const [title, setTitle] = useState(params.section.title);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy || params.readOnly) return;
    setBusy(true);
    await apiFetch(`/api/instructor/courses/${params.courseId}/sections/${params.section.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    window.location.reload();
  }

  async function del() {
    if (busy || params.readOnly) return;
    const ok = window.confirm('確認刪除章節？（章節內單元也會一併刪除）');
    if (!ok) return;
    setBusy(true);
    await apiFetch(`/api/instructor/courses/${params.courseId}/sections/${params.section.id}`, { method: 'DELETE' });
    window.location.reload();
  }

  async function addLesson() {
    if (busy || params.readOnly) return;
    setBusy(true);
    await apiFetch(`/api/instructor/sections/${params.section.id}/lessons`, {
      method: 'POST',
      body: JSON.stringify({ title: 'New Lesson', contentType: 'text', contentText: '...' }),
    });
    window.location.reload();
  }

  async function move(delta: -1 | 1) {
    if (busy || params.readOnly) return;
    setBusy(true);
    await apiFetch(`/api/instructor/sections/${params.section.id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order: params.section.order + delta }),
    });
    window.location.reload();
  }

  return (
    <div className="rounded border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <div className="text-xs text-slate-500">{params.section.order}</div>
          <Input disabled={busy || params.readOnly} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="章節標題" />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={busy || params.readOnly} onClick={() => void move(-1)}>
            ↑
          </Button>
          <Button type="button" variant="secondary" disabled={busy || params.readOnly} onClick={() => void move(1)}>
            ↓
          </Button>
          <Button type="button" variant="secondary" disabled={busy || params.readOnly} onClick={() => void save()}>
            儲存
          </Button>
          <Button type="button" variant="danger" disabled={busy || params.readOnly} onClick={() => void del()}>
            刪除
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {params.section.lessons.map((l) => (
          <LessonEditor key={l.id} sectionId={params.section.id} lesson={l} readOnly={params.readOnly} />
        ))}
      </div>

      <div className="mt-3">
        <Button type="button" disabled={busy || params.readOnly} onClick={() => void addLesson()}>
          + 新增單元
        </Button>
      </div>
    </div>
  );
}
