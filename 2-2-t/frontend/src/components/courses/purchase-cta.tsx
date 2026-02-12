'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { apiFetch, isApiError } from '../../services/api-client';

export function PurchaseCta({ courseId, isPurchased }: { courseId: string; isPurchased: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPurchased) {
    return (
      <div className="rounded-md border p-4 text-sm">
        你已購買此課程。
        <Link className="ml-2 text-blue-600 hover:underline" href="/my-courses">
          前往我的課程
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button
        type="button"
        disabled={submitting}
        onClick={async () => {
          setError(null);
          setSubmitting(true);
          try {
            await apiFetch(`/courses/${encodeURIComponent(courseId)}/purchase`, { method: 'POST' });
            window.location.href = `/my-courses/${encodeURIComponent(courseId)}`;
          } catch (err) {
            if (isApiError(err)) {
              if (err.status === 401) {
                window.location.href = `/login?redirect=${encodeURIComponent(`/courses/${courseId}`)}`;
                return;
              }
              setError(err.message);
            } else {
              setError('購買失敗，請稍後再試');
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting ? '處理中…' : '購買此課程'}
      </Button>
      <div className="text-xs text-gray-600">本專案為示範：購買為冪等操作。</div>
    </div>
  );
}
