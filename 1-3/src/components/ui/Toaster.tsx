'use client';

import { dismiss, useToastState } from '@/lib/shared/toast';

function variantClass(variant: 'success' | 'error' | 'info') {
  switch (variant) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'info':
      return 'border-neutral-200 bg-white text-neutral-800';
  }
}

export function Toaster() {
  const { items } = useToastState();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 rounded-lg border p-3 shadow-sm ${variantClass(t.variant)}`}
          role="status"
          aria-live={t.variant === 'error' ? 'assertive' : 'polite'}
        >
          <div className="text-sm leading-5">{t.message}</div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs text-current/70 hover:bg-black/5"
            onClick={() => dismiss(t.id)}
            aria-label="關閉通知"
          >
            關閉
          </button>
        </div>
      ))}
    </div>
  );
}
