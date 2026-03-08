import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastLevel = 'info' | 'success' | 'error';

type ToastItem = {
  id: string;
  level: ToastLevel;
  message: string;
};

type ToastApi = {
  push: (level: ToastLevel, message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function ToastViewport(props: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {props.items.map((t) => (
        <div
          key={t.id}
          className={
            `pointer-events-auto rounded border px-3 py-2 text-sm shadow ` +
            (t.level === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : t.level === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-slate-200 bg-white text-slate-900')
          }
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="break-words">{t.message}</div>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-900"
              onClick={() => props.onDismiss(t.id)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider(props: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((level: ToastLevel, message: string) => {
    const id = crypto.randomUUID();
    const item: ToastItem = { id, level, message };
    setItems((prev) => [item, ...prev].slice(0, 5));
    window.setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      info: (m) => push('info', m),
      success: (m) => push('success', m),
      error: (m) => push('error', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  override componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="mx-auto max-w-xl rounded border border-rose-200 bg-rose-50 p-4 text-rose-900">
            <div className="text-sm font-semibold">發生未預期的錯誤</div>
            <div className="mt-1 text-sm opacity-90">{this.state.errorMessage}</div>
            <button
              type="button"
              className="mt-3 rounded bg-rose-700 px-3 py-2 text-sm font-medium text-white"
              onClick={() => window.location.reload()}
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
