import { useState } from 'react';
import { AsyncButton } from '../ui/AsyncButton';

export function RejectReasonDialog(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  error?: string;
}) {
  if (!props.open) return null;

  return (
    <RejectReasonDialogInner
      onClose={props.onClose}
      onConfirm={props.onConfirm}
      isPending={props.isPending}
      error={props.error}
    />
  );
}

function RejectReasonDialogInner(props: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  error?: string;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
        <div className="text-sm font-semibold">退回理由（必填）</div>
        <textarea
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="請描述退回原因…"
        />

        {props.error ? <div className="mt-2 text-xs text-rose-700">{props.error}</div> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={props.onClose}
            type="button"
          >
            取消
          </button>
          <AsyncButton
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
            isLoading={props.isPending}
            loadingText="送出中…"
            onClick={() => props.onConfirm(reason)}
            type="button"
          >
            確認退回
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
