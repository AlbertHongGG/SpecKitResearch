'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Textarea } from '@/components/ui/Textarea';
import { queryKeys } from '@/lib/queryKeys';
import { adminClient } from '@/services/adminClient';

export function ReviewDecisionForm({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<'published' | 'rejected'>('published');
  const [reason, setReason] = useState('');

  const m = useMutation({
    mutationFn: async () => {
      return adminClient.reviewCourse(courseId, {
        decision,
        reason: decision === 'rejected' ? reason : null,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.reviewQueue() });
      await qc.invalidateQueries({ queryKey: queryKeys.adminCourse(courseId) });
      await qc.invalidateQueries({ queryKey: ['admin', 'reviews', courseId] });
      window.alert('已送出審核結果');
      window.location.href = '/admin/reviews';
    },
  });

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="text-sm font-medium text-slate-900">審核決策</div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={decision === 'published'} onChange={() => setDecision('published')} />
          核准上架
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={decision === 'rejected'} onChange={() => setDecision('rejected')} />
          駁回
        </label>
      </div>

      {decision === 'rejected' ? (
        <div className="mt-3">
          <label className="text-sm font-medium text-slate-900">駁回理由（必填）</label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        </div>
      ) : null}

      {m.isError ? (
        <div className="mt-3">
          <InlineError message={(m.error as any)?.message ?? '送出失敗'} />
        </div>
      ) : null}

      <div className="mt-4">
        <Button type="button" onClick={() => m.mutate()} disabled={m.isPending || (decision === 'rejected' && !reason.trim())}>
          {m.isPending ? '送出中…' : '送出'}
        </Button>
      </div>
    </div>
  );
}
