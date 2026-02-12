'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastPush = (params: {
  kind: ToastKind;
  message: string;
  durationMs?: number;
}) => void;

type ToastContextValue = {
  push: ToastPush;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function randomId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const t = timeouts.current.get(id);
    if (t) window.clearTimeout(t);
    timeouts.current.delete(id);
  }, []);

  const push = useCallback<ToastPush>(({ kind, message, durationMs }) => {
    const id = randomId();
    const toast: ToastItem = { id, kind, message };
    setItems((prev) => [toast, ...prev].slice(0, 5));

    const ms = durationMs ?? (kind === 'error' ? 6000 : 3000);
    const timeout = window.setTimeout(() => remove(id), ms);
    timeouts.current.set(id, timeout);
  }, [remove]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => {
          const styles =
            t.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : t.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-slate-200 bg-white text-slate-900';

          return (
            <div
              key={t.id}
              role="status"
              className={`rounded border p-3 text-sm shadow ${styles}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="whitespace-pre-wrap">{t.message}</div>
                <button
                  type="button"
                  aria-label="關閉"
                  className="text-xs text-slate-600 hover:text-slate-900"
                  onClick={() => remove(t.id)}
                >
                  關閉
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');

  const success = useCallback((message: string) => ctx.push({ kind: 'success', message }), [ctx]);
  const error = useCallback((message: string) => ctx.push({ kind: 'error', message }), [ctx]);
  const info = useCallback((message: string) => ctx.push({ kind: 'info', message }), [ctx]);

  return { push: ctx.push, success, error, info };
}
