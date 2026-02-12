import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
};

type ToastApi = {
  push: (toast: Omit<Toast, 'id'> & { id?: string }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function toastClass(type: Toast['type']) {
  switch (type) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    case 'info':
      return 'border-slate-200 bg-white text-slate-900';
  }
}

export function ToastProvider(props: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, 'id'> & { id?: string }) => {
      const id = t.id ?? crypto.randomUUID();
      const toast: Toast = { id, type: t.type, message: t.message };
      setToasts((prev) => [toast, ...prev].slice(0, 5));
      window.setTimeout(() => remove(id), 4500);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message) => push({ type: 'success', message }),
      error: (message) => push({ type: 'error', message }),
      info: (message) => push({ type: 'info', message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {props.children}

      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-3 py-2 shadow-sm ${toastClass(t.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm">{t.message}</div>
              <button
                className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-black/5"
                onClick={() => remove(t.id)}
                type="button"
              >
                關閉
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
