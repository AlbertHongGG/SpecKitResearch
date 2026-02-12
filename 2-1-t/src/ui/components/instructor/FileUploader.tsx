'use client';

import { useState } from 'react';

export type UploadedFile = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  originalName: string;
  isPublic: boolean;
};

export function FileUploader(params: {
  ownerCourseId?: string;
  ownerLessonId?: string;
  accept: string;
  disabled?: boolean;
  onUploaded: (file: UploadedFile) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ name: string; size: number } | null>(null);

  async function onPick(file: File) {
    setError(null);
    setPicked({ name: file.name, size: file.size });
    setIsUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      if (params.ownerCourseId) form.set('ownerCourseId', params.ownerCourseId);
      if (params.ownerLessonId) form.set('ownerLessonId', params.ownerLessonId);

      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: form,
        credentials: 'include',
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message ?? '上傳失敗';
        throw new Error(msg);
      }

      params.onUploaded(json.file as UploadedFile);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept={params.accept}
        disabled={params.disabled || isUploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onPick(f);
        }}
      />
      {picked ? (
        <div className="text-xs text-slate-600">
          已選擇：{picked.name}（{Math.ceil(picked.size / 1024)} KB）
        </div>
      ) : (
        <div className="text-xs text-slate-600">尚未選擇檔案</div>
      )}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {isUploading ? <div className="text-xs text-slate-600">上傳中…</div> : null}
    </div>
  );
}
