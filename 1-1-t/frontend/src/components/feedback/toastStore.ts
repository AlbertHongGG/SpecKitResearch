import { useSyncExternalStore } from 'react';

export type ToastItem = {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  code?: string;
};

let items: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function pushToast(input: Omit<ToastItem, 'id'>) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  items = [...items, { id, ...input }];
  emit();

  window.setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 3500);
}

export function useToasts() {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => items,
  );
}

export function dismissToast(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}
