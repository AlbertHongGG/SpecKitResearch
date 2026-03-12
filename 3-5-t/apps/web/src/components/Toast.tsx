'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type ToastVariant = 'info' | 'success' | 'error';

export type ToastInput = {
  title?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = Required<Pick<ToastInput, 'message'>> &
  Pick<ToastInput, 'title'> & {
    id: string;
    variant: ToastVariant;
    expiresAt: number;
  };

type ToastApi = {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function tone(variant: ToastVariant): { wrap: string; title: string; body: string } {
  switch (variant) {
    case 'success':
      return {
        wrap: 'border-emerald-200 bg-emerald-50',
        title: 'text-emerald-900',
        body: 'text-emerald-900',
      };
    case 'error':
      return {
        wrap: 'border-red-200 bg-red-50',
        title: 'text-red-900',
        body: 'text-red-900',
      };
    default:
      return {
        wrap: 'border-slate-200 bg-white',
        title: 'text-slate-900',
        body: 'text-slate-800',
      };
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const now = Date.now();
    const id = newId();
    const durationMs = typeof input.durationMs === 'number' ? input.durationMs : 4000;

    const item: ToastItem = {
      id,
      title: input.title,
      message: input.message,
      variant: input.variant ?? 'info',
      expiresAt: now + durationMs,
    };

    setItems((prev) => [item, ...prev].slice(0, 5));

    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss, clear }), [toast, dismiss, clear]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] w-full max-w-sm space-y-2">
      {items.map((t) => {
        const colors = tone(t.variant);
        return (
          <div key={t.id} className={`rounded-lg border p-3 shadow-sm ${colors.wrap}`} role="status">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {t.title ? <div className={`text-sm font-semibold ${colors.title}`}>{t.title}</div> : null}
                <div className={`mt-1 text-sm ${colors.body}`}>{t.message}</div>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => onDismiss(t.id)}
                aria-label="dismiss"
              >
                關閉
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
