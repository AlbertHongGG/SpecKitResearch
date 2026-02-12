'use client';

import { useState } from 'react';
import { Alert } from '../../../../components/ui/alert';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { decideReview } from '../../../../services/admin';
import { isApiError } from '../../../../services/api-client';

export function DecisionForm({ courseId }: { courseId: string }) {
  const [decision, setDecision] = useState<'published' | 'rejected'>('published');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="text-sm font-semibold">做出決策</div>
      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={decision === 'published' ? 'primary' : 'outline'} onClick={() => setDecision('published')}>
          核准上架
        </Button>
        <Button type="button" variant={decision === 'rejected' ? 'primary' : 'outline'} onClick={() => setDecision('rejected')}>
          駁回
        </Button>
      </div>

      {decision === 'rejected' ? (
        <Input label="駁回理由（必填）" value={reason} onChange={(e) => setReason(e.target.value)} required />
      ) : (
        <Input label="備註（選填）" value={note} onChange={(e) => setNote(e.target.value)} />
      )}

      <Button
        type="button"
        disabled={submitting}
        onClick={async () => {
          setError(null);
          setSubmitting(true);
          try {
            await decideReview(courseId, {
              decision,
              reason: decision === 'rejected' ? reason : null,
              note: decision === 'published' ? note : null,
            });
            window.location.href = '/admin/reviews';
          } catch (err) {
            if (isApiError(err)) setError(err.message);
            else setError('操作失敗，請稍後再試');
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {submitting ? '送出中…' : '送出決策'}
      </Button>
    </div>
  );
}
