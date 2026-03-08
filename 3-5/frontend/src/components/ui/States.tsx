'use client';

export function LoadingState({ label = '載入中…' }: { label?: string }) {
  return <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>;
}

export function EmptyState({ label = '沒有資料。' }: { label?: string }) {
  return <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>;
}

export function ErrorState({ label = '載入失敗' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
      {label}
    </div>
  );
}
