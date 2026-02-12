import { dismissToast, useToasts } from './toastStore';

export function Toast() {
  const toasts = useToasts();

  return (
    <div className="fixed right-4 top-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`min-w-[260px] rounded-md border bg-white px-3 py-2 text-sm shadow ${
            t.type === 'success'
              ? 'border-green-200'
              : t.type === 'error'
                ? 'border-red-200'
                : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-slate-900">{t.message}</div>
              {t.code ? <div className="mt-0.5 text-xs text-slate-500">({t.code})</div> : null}
            </div>
            <button
              className="text-slate-500 hover:text-slate-900"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
