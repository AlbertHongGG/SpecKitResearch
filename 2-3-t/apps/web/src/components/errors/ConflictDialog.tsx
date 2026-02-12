'use client';

export default function ConflictDialog({
  open,
  title,
  message,
  onClose,
  onReload,
}: {
  open: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  onReload: () => void | Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-xl">
        <div className="text-sm font-semibold text-slate-900">{title ?? '資料衝突'}</div>
        <div className="mt-2 text-sm text-slate-700">
          {message ?? '此資料已被其他人更新。請重新載入最新資料後再嘗試一次。'}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
            onClick={onClose}
            data-testid="conflict-cancel"
          >
            關閉
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white"
            onClick={onReload}
            data-testid="conflict-reload"
          >
            重新載入
          </button>
        </div>
      </div>
    </div>
  );
}
