import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastType = 'info' | 'success' | 'error';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  push: (args: { type: ToastType; message: string }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastStyles(type: ToastType) {
  switch (type) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'error':
      return 'border-rose-200 bg-rose-50 text-rose-900';
    default:
      return 'border-slate-200 bg-white text-slate-900';
  }
}

export function ToastProvider(props: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((args: { type: ToastType; message: string }) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const toast: Toast = { id, type: args.type, message: args.message };

    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {props.children}

      <div
        className="fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded border px-3 py-2 text-sm shadow ${toastStyles(t.type)}`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
