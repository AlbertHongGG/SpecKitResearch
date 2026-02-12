'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { instructorClient } from '@/services/instructorClient';

export function FileUpload({
  label,
  meta,
  onUploaded,
  accept,
}: {
  label: string;
  meta?: { courseId?: string };
  onUploaded: (v: { fileId: string; url: string; mimeType: string; originalName: string | null }) => void;
  accept?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <div className="rounded-md border border-slate-200 p-3">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="file"
          accept={accept}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setError(null);
            setIsUploading(true);
            try {
              const result = await instructorClient.upload(f, meta);
              onUploaded(result);
            } catch (err) {
              setError(err instanceof Error ? err.message : '上傳失敗');
            } finally {
              setIsUploading(false);
            }
          }}
        />
        <Button type="button" disabled>
          選擇檔案
        </Button>
      </div>
      {isUploading ? (
        <div className="mt-2">
          <Loading label="上傳中…" />
        </div>
      ) : null}
      {error ? (
        <div className="mt-2">
          <InlineError message={error} />
        </div>
      ) : null}
    </div>
  );
}
