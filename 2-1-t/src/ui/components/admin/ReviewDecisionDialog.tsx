'use client';

import { useState } from 'react';

import { Button } from '../Button';
import { Modal } from '../Modal';
import { apiFetch } from '../../lib/apiClient';
import { useToast } from '../Toast';
import { useSingleFlight } from '../../lib/mutations';

export function ReviewDecisionDialog(params: {
  courseId: string;
  courseTitle: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { busy, run } = useSingleFlight();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'published' | 'rejected') {
    setError(null);
    await run(async () => {
      try {
        await apiFetch(`/api/admin/courses/${params.courseId}/review`, {
          method: 'POST',
          body: JSON.stringify({ decision, reason: decision === 'rejected' ? reason : undefined }),
        });
        toast.success(decision === 'published' ? '已核准上架' : '已駁回');
        setOpen(false);
        setReason('');
        params.onDone();
      } catch (e) {
        const msg = e instanceof Error ? e.message : '審核失敗';
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        審核
      </Button>
      <Modal open={open} title={`審核：${params.courseTitle}`} onClose={() => (busy ? null : setOpen(false))}>
        <div className="space-y-3">
          <div className="text-sm text-slate-700">核准將把狀態切到 published；駁回需填理由（會切到 rejected）。</div>

          <div>
            <div className="text-xs text-slate-600">駁回理由（僅駁回時必填）</div>
            <textarea
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
              rows={4}
              placeholder="例如：內容不完整、缺少課綱、侵權疑慮…"
            />
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => void decide('published')}>
              核准上架
            </Button>
            <Button type="button" variant="danger" disabled={busy} onClick={() => void decide('rejected')}>
              駁回
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
              取消
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
