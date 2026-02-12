import type { Transaction } from '../../services/transactions';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('zh-TW').format(amount);
}

export function TransactionDeleteConfirmDialog(props: {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onConfirm: (args: { transactionId: string }) => Promise<void>;
  submitting?: boolean;
}) {
  const tx = props.transaction;
  if (!props.open || !tx) return null;

  const transactionId = tx.id;

  async function confirm() {
    await props.onConfirm({ transactionId });
    props.onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="刪除帳務"
    >
      <div className="w-full max-w-md rounded-lg bg-white shadow">
        <div className="border-b px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">刪除帳務</h2>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-slate-800">確定要刪除這筆帳務嗎？此操作無法復原。</p>
          <div className="rounded border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{tx.categoryName}</span>
              <span className="shrink-0 font-semibold">
                {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600">{tx.date}{tx.note ? ` · ${tx.note}` : ''}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t px-5 py-4">
          <button
            type="button"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={props.onClose}
            disabled={props.submitting}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            onClick={confirm}
            disabled={props.submitting}
          >
            刪除
          </button>
        </div>
      </div>
    </div>
  );
}
