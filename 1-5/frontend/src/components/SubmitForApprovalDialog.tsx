import { useState } from 'react';

import type { DocumentDetail } from '../services/documents';
import { useActiveFlows, useSubmitDocument } from '../services/documents';
import { ErrorState, LoadingState } from '../ui/states';
import { AsyncButton } from '../ui/AsyncButton';
import { useToast } from '../ui/toast';

export function SubmitForApprovalDialog(props: { document: DocumentDetail }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');

  const flows = useActiveFlows();
  const submit = useSubmitDocument(props.document.document.id);
  const toast = useToast();

  if (!open) {
    return (
      <button
        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        onClick={() => setOpen(true)}
        type="button"
      >
        送審
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-700">選擇流程模板後送審。送審後 Draft 將鎖定不可編輯。</div>

      {flows.isLoading ? <LoadingState /> : null}
      {flows.isError ? <ErrorState>無法載入流程模板。</ErrorState> : null}

      {flows.data ? (
        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">請選擇模板</option>
          {flows.data.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex items-center gap-2">
        <AsyncButton
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={!selected}
          isLoading={submit.isPending}
          loadingText="送審中…"
          onClick={async () => {
            try {
              await submit.mutateAsync(selected);
              toast.success('已送審');
              setOpen(false);
            } catch {
              toast.error('送審失敗');
            }
          }}
          type="button"
        >
          確認送審
        </AsyncButton>
        <button
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => setOpen(false)}
          type="button"
        >
          取消
        </button>
      </div>
    </div>
  );
}
