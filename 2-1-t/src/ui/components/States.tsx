'use client';

import { Button } from './Button';

export function LoadingState({ label = '載入中…' }: { label?: string }) {
  return <div className="text-sm text-slate-600">{label}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 p-6">
      <div className="text-sm font-medium">{title}</div>
      {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4">
      <div className="text-sm font-medium text-red-900">發生錯誤</div>
      <div className="mt-1 text-sm text-red-800">{message}</div>
      {onRetry ? (
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={onRetry}>
            重試
          </Button>
        </div>
      ) : null}
    </div>
  );
}
