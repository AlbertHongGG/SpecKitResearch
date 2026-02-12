'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../ui/alert';
import { Button } from '../ui/button';
import { submitInstructorCourse } from '../../services/instructor';
import { isApiError } from '../../services/api-client';

export function CourseStatusActions({ courseId, status }: { courseId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="text-sm font-semibold">狀態：{status}</div>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <Button
        type="button"
        disabled={submitting || status !== 'draft'}
        onClick={async () => {
          setError(null);
          setSubmitting(true);
          try {
            await submitInstructorCourse(courseId);
            router.refresh();
          } catch (err) {
            if (isApiError(err)) setError(err.message);
            else setError('提交失敗');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting ? '提交中…' : '提交審核'}
      </Button>

      {status === 'submitted' ? <div className="text-xs text-gray-600">submitted 狀態下不可修改內容。</div> : null}
    </div>
  );
}
