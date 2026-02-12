import { useState } from 'react';

import type { DocumentDetail } from '../services/documents';
import { useArchiveDocument } from '../services/documents';
import { AsyncButton } from '../ui/AsyncButton';
import { useToast } from '../ui/toast';

export function AdminArchiveButton(props: { document: DocumentDetail }) {
  const [confirming, setConfirming] = useState(false);
  const archive = useArchiveDocument(props.document.document.id);
  const toast = useToast();

  if (props.document.document.status !== 'Approved') return null;

  if (!confirming) {
    return (
      <AsyncButton
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        isLoading={archive.isPending}
        onClick={() => setConfirming(true)}
        type="button"
      >
        封存
      </AsyncButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-xs text-slate-600">確定要封存？</div>
      <button
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
        onClick={() => setConfirming(false)}
        type="button"
      >
        取消
      </button>
      <AsyncButton
        className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        isLoading={archive.isPending}
        loadingText="封存中…"
        onClick={async () => {
          try {
            await archive.mutateAsync();
            toast.success('已封存');
            setConfirming(false);
          } catch {
            toast.error('封存失敗');
          }
        }}
        type="button"
      >
        確認封存
      </AsyncButton>
    </div>
  );
}
