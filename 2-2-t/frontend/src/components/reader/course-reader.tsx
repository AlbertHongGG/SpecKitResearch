'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MyCourseReader } from '@app/contracts';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { isApiError } from '../../services/api-client';
import { markLessonComplete } from '../../services/progress';
import { ContentRenderer } from './content-renderer';
import { getAttachmentDownloadUrl } from '../../services/attachments';

export function CourseReader({ data, apiBaseUrl }: { data: MyCourseReader; apiBaseUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sections = data.curriculum.slice().sort((a, b) => a.position - b.position);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div className="rounded-md border p-3">
          <div className="text-sm font-semibold">課綱</div>
          <div className="mt-1 text-xs text-gray-600">
            進度：{data.progressSummary.completedLessons}/{data.progressSummary.totalLessons}
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((s) => (
            <div key={s.id} className="rounded-md border p-3">
              <div className="text-sm font-medium">
                {s.position}. {s.title}
              </div>
              <ol className="mt-2 space-y-1 text-sm">
                {s.lessons
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((l) => {
                    const active = l.id === data.lesson.id;
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/my-courses/${data.course.id}?lessonId=${encodeURIComponent(l.id)}`}
                          className={active ? 'font-medium text-black' : 'text-gray-700 hover:text-black'}
                        >
                          {l.position}. {l.title}
                        </Link>
                      </li>
                    );
                  })}
              </ol>
            </div>
          ))}
        </div>
      </aside>

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.course.title}</h1>
          <div className="mt-1 text-sm text-gray-600">單元：{data.lesson.title}</div>
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="rounded-md border p-4">
          {data.lesson.contentType === 'text' ? (
            <ContentRenderer text={data.lesson.contentText || ''} />
          ) : null}

          {data.lesson.contentType === 'image' && data.lesson.contentImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.lesson.contentImageUrl} alt={data.lesson.title} className="max-w-full rounded" />
          ) : null}

          {data.lesson.contentType === 'pdf' ? (
            <div className="text-sm text-gray-700">此單元包含 PDF 附件（請於下方下載）。</div>
          ) : null}

          {data.lesson.attachments.length ? (
            <div className="mt-4">
              <div className="text-sm font-medium">附件</div>
              <ul className="mt-2 space-y-1 text-sm">
                {data.lesson.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      className="text-blue-600 hover:underline"
                      href={getAttachmentDownloadUrl(apiBaseUrl, a.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.filename}
                    </a>
                    <span className="ml-2 text-xs text-gray-500">({Math.round(a.sizeBytes / 1024)} KB)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setError(null);
                setSubmitting(true);
                try {
                  await markLessonComplete(data.lesson.id);
                  router.refresh();
                } catch (err) {
                  if (isApiError(err)) setError(err.message);
                  else setError('操作失敗，請稍後再試');
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? '更新中…' : '標記完成'}
            </Button>
            <Link href="/my-courses" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
              回到我的課程
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
