import type { PropsWithChildren } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './ToastContext';
import type { ToastApi } from './ToastContext';
import type { ToastItem } from './toastTypes';
import { ToastViewport } from './ToastViewport';

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider(props: PropsWithChildren<{ maxToasts?: number; autoDismissMs?: number }>) {
  const maxToasts = props.maxToasts ?? 3;
  const autoDismissMs = props.autoDismissMs ?? 4500;

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const push: ToastApi['push'] = useCallback(
    (toast) => {
      const id = toast.id ?? createId();
      const item: ToastItem = {
        id,
        variant: toast.variant,
        title: toast.title,
        ...(toast.description !== undefined ? { description: toast.description } : {}),
        createdAt: Date.now(),
      };

      setToasts((prev) => [item, ...prev].slice(0, maxToasts));

      const timeout = window.setTimeout(() => {
        dismiss(id);
      }, autoDismissMs);
      timers.current.set(id, timeout);

      return id;
    },
    [autoDismissMs, dismiss, maxToasts],
  );

  const api: ToastApi = useMemo(
    () => ({
      toasts,
      push,
      dismiss,
      success: (title, description) =>
        push({ variant: 'success', title, ...(description !== undefined ? { description } : {}) }),
      error: (title, description) => push({ variant: 'error', title, ...(description !== undefined ? { description } : {}) }),
      info: (title, description) => push({ variant: 'info', title, ...(description !== undefined ? { description } : {}) }),
    }),
    [dismiss, push, toasts],
  );

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
