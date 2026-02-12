'use client';

import { useState } from 'react';

import { Button } from '../Button';
import { Select } from '../Select';
import { Input } from '../Input';
import { FileUploader, type UploadedFile } from './FileUploader';
import { apiFetch } from '../../lib/apiClient';

export type InstructorLesson = {
  id: string;
  title: string;
  order: number;
  contentType: 'text' | 'image' | 'pdf';
  contentText: string | null;
  contentFileId: string | null;
  contentFileName: string | null;
};

export function LessonEditor(params: {
  sectionId: string;
  lesson: InstructorLesson;
  readOnly?: boolean;
}) {
  const [title, setTitle] = useState(params.lesson.title);
  const [contentType, setContentType] = useState<InstructorLesson['contentType']>(params.lesson.contentType);
  const [contentText, setContentText] = useState(params.lesson.contentText ?? '');
  const [contentFileId, setContentFileId] = useState<string | null>(params.lesson.contentFileId);
  const [contentFileName, setContentFileName] = useState<string | null>(params.lesson.contentFileName);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (busy || params.readOnly) return;
    setBusy(true);
    await apiFetch(`/api/instructor/sections/${params.sectionId}/lessons/${params.lesson.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title,
        contentType,
        contentText: contentType === 'text' ? contentText : null,
        contentFileId: contentType === 'text' ? null : contentFileId,
        contentFileName: contentType === 'pdf' ? contentFileName : null,
      }),
    });
    window.location.reload();
  }

  async function del() {
    if (busy || params.readOnly) return;
    const ok = window.confirm('確認刪除單元？');
    if (!ok) return;
    setBusy(true);
    await apiFetch(`/api/instructor/sections/${params.sectionId}/lessons/${params.lesson.id}`, { method: 'DELETE' });
    window.location.reload();
  }

  async function move(delta: -1 | 1) {
    if (busy || params.readOnly) return;
    setBusy(true);
    await apiFetch(`/api/instructor/lessons/${params.lesson.id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order: params.lesson.order + delta }),
    });
    window.location.reload();
  }

  function onUploaded(file: UploadedFile) {
    setContentFileId(file.id);
    setContentFileName(file.originalName);
  }

  return (
    <div className="rounded border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <div className="text-xs text-slate-500">{params.lesson.order}</div>
          <Input disabled={busy || params.readOnly} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="單元標題" />
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

      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs text-slate-600">內容型態</div>
          <Select
            value={contentType}
            disabled={busy || params.readOnly}
            onChange={(e) => {
              const v = e.target.value as InstructorLesson['contentType'];
              setContentType(v);
            }}
          >
            <option value="text">text</option>
            <option value="image">image</option>
            <option value="pdf">pdf</option>
          </Select>
        </div>

        {contentType === 'text' ? (
          <div>
            <div className="text-xs text-slate-600">文字內容</div>
            <textarea
              value={contentText}
              disabled={busy || params.readOnly}
              onChange={(e) => setContentText(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
              rows={4}
            />
          </div>
        ) : (
          <div>
            <div className="text-xs text-slate-600">檔案（image/pdf）</div>
            <FileUploader
              accept={contentType === 'image' ? 'image/*' : 'application/pdf'}
              ownerLessonId={params.lesson.id}
              disabled={busy || params.readOnly}
              onUploaded={onUploaded}
            />
            {contentFileId ? (
              <div className="mt-2 text-xs text-slate-600">已選：{contentFileName ?? contentFileId}</div>
            ) : (
              <div className="mt-2 text-xs text-slate-600">尚未上傳</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
