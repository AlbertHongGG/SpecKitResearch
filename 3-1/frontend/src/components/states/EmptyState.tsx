'use client';

export function EmptyState({
  title = '目前沒有資料',
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4 text-neutral-900">
      <div className="font-semibold">{title}</div>
      {message ? <div className="mt-1 text-sm text-neutral-700">{message}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
