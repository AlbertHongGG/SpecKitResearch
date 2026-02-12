import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { reviewsApi } from '../../api/reviews';
import { ApiError } from '../../api/http';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { useToast } from '../toast/ToastContext';

export function ReviewActionPanel(props: {
  reviewTaskId: string;
  disabled?: boolean;
  onDone: () => void | Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  const approveMutation = useMutation({
    mutationFn: async () => reviewsApi.approve(props.reviewTaskId),
    onSuccess: async () => {
      setErrorMessage(null);
      toast.success('已同意');
      await props.onDone();
    },
    onError: (e) => {
      const msg = formatApiError(e);
      setErrorMessage(msg);
      toast.error('同意失敗', msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      if (!trimmed) {
        throw new Error('退回理由必填');
      }
      return reviewsApi.reject(props.reviewTaskId, { reason: trimmed });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setReason('');
      toast.success('已退回');
      await props.onDone();
    },
    onError: (e) => {
      const msg = formatApiError(e);
      setErrorMessage(msg);
      toast.error('退回失敗', msg);
    },
  });

  const isBusy = approveMutation.isPending || rejectMutation.isPending;
  const isDisabled = Boolean(props.disabled) || isBusy;

  const conflictHint = useMemo(() => {
    if (!errorMessage) return null;
    if (errorMessage.includes('409')) {
      return '此任務可能已被處理（或重複送出），請重新整理確認狀態。';
    }
    return null;
  }, [errorMessage]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold">我的審核動作</div>
      <div className="mt-3 grid grid-cols-1 gap-3">
        <div>
          <div className="text-xs font-medium text-slate-700">退回理由（必填）</div>
          <TextArea
            data-testid="reject-reason"
            value={reason}
            disabled={isDisabled}
            rows={3}
            placeholder="請描述需要修改的原因"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {errorMessage ? (
          <div
            data-testid="review-action-error"
            className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700"
          >
            {errorMessage}
            {conflictHint ? <div className="mt-1 text-xs text-red-700">{conflictHint}</div> : null}
          </div>
        ) : null}

        <div className="flex gap-2">
          <Button
            data-testid="approve-task"
            variant="secondary"
            disabled={isDisabled}
            loading={approveMutation.isPending}
            onClick={() => approveMutation.mutate()}
          >
            同意
          </Button>
          <Button
            data-testid="reject-task"
            variant="danger"
            disabled={isDisabled}
            loading={rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
          >
            退回
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatApiError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) {
      return `409 衝突：${e.message}`;
    }
    return `${e.status}：${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return '發生未知錯誤';
}
