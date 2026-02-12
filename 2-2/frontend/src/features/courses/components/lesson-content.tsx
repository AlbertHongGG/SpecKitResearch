'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export function LessonContent({ lesson }: { lesson: any }) {
  const [file, setFile] = useState<{ url: string; name?: string; contentType: string } | null>(null);

  useEffect(() => {
    if (lesson.contentType === 'pdf' || lesson.contentType === 'image') {
      apiFetch(`/files/lessons/${lesson.id}`).then(setFile).catch(() => setFile(null));
    }
  }, [lesson]);

  if (lesson.contentType === 'text') {
    return <p className="text-slate-700 whitespace-pre-wrap">{lesson.contentText}</p>;
  }

  if (lesson.contentType === 'image') {
    return file?.url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={file.url} alt={lesson.title} className="max-w-full rounded border" />
    ) : (
      <p className="text-slate-500">載入圖片中...</p>
    );
  }

  if (lesson.contentType === 'pdf') {
    return file?.url ? (
      <a
        href={file.url}
        className="text-blue-600"
        target="_blank"
        rel="noreferrer"
      >
        下載附件 {file.name ? `(${file.name})` : ''}
      </a>
    ) : (
      <p className="text-slate-500">載入附件中...</p>
    );
  }

  return null;
}
