import React from 'react';

export function PageState({
  state,
  error,
  onRetry,
  children,
}: {
  state: 'loading' | 'ready' | 'error';
  error?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (state === 'loading') return <div className="p-6 text-sm text-slate-600">載入中…</div>;
  if (state === 'error')
    return (
      <div className="p-6 text-sm text-red-600">
        {error ?? '發生錯誤'}
        {onRetry ? (
          <div className="mt-3">
            <button className="rounded border bg-white px-3 py-2 text-sm" type="button" onClick={onRetry}>
              重試
            </button>
          </div>
        ) : null}
      </div>
    );
  return <>{children}</>;
}
