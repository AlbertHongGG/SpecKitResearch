import { useMemo, useState } from 'react';

import type { DocumentDetail } from '../services/documents';
import { isConflictError, userFacingErrorMessage } from '../services/apiClient';
import { useMe } from '../services/auth';
import { useActOnReviewTask } from '../services/reviews';
import { AsyncButton } from '../ui/AsyncButton';
import { useToast } from '../ui/toast';
import { RejectReasonDialog } from './RejectReasonDialog';

export function ReviewerActionPanel(props: { document: DocumentDetail }) {
  const me = useMe();
  const act = useActOnReviewTask();
  const toast = useToast();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();

  const myTask = useMemo(() => {
    const myId = me.data?.id;
    if (!myId) return undefined;
    return props.document.reviewTasks.find((t) => t.status === 'Pending' && t.assignee.id === myId);
  }, [me.data?.id, props.document.reviewTasks]);

  if (me.data?.role !== 'Reviewer') return null;

  if (!myTask) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold">我的待辦</div>
        <div className="mt-2 text-sm text-slate-600">你目前沒有可處理的 Pending 任務。</div>
      </div>
    );
  }

  const conflict = isConflictError(act.error);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">我的待辦</div>
          <div className="mt-1 text-xs text-slate-600">
            Step：{myTask.stepKey} · {myTask.mode}
          </div>
        </div>
        <div className="text-xs text-slate-500">Task：{myTask.id.slice(0, 8)}…</div>
      </div>

      {conflict ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          這筆任務已被處理（可能在其他分頁）。已自動重新整理待辦。
        </div>
      ) : null}

      {act.isError && !conflict ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          操作失敗：{userFacingErrorMessage(act.error)}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <AsyncButton
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          isLoading={act.isPending}
          loadingText="送出中…"
          onClick={() => {
            setLocalError(undefined);
            act.mutate(
              { taskId: myTask.id, action: 'Approve' },
              { onSuccess: () => toast.success('已同意') },
            );
          }}
          type="button"
        >
          同意
        </AsyncButton>

        <button
          className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          disabled={act.isPending}
          onClick={() => {
            setLocalError(undefined);
            setRejectOpen(true);
          }}
          type="button"
        >
          退回
        </button>
      </div>

      <RejectReasonDialog
        open={rejectOpen}
        isPending={act.isPending}
        error={localError}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => {
          const trimmed = reason.trim();
          if (trimmed.length === 0) {
            setLocalError('請填寫退回理由');
            return;
          }
          setLocalError(undefined);
          act.mutate(
            { taskId: myTask.id, action: 'Reject', reason: trimmed },
            {
              onSuccess: () => {
                toast.success('已退回');
                setRejectOpen(false);
              },
            },
          );
        }}
      />
    </div>
  );
}
