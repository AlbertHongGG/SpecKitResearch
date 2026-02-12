'use client';

export function ErrorState({
  title = '發生錯誤',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-red-900">
      <div className="font-semibold">{title}</div>
      {message ? <div className="mt-1 text-sm">{message}</div> : null}
      {onRetry ? (
        <button
          className="mt-3 rounded bg-red-600 px-3 py-2 text-sm text-white"
          onClick={onRetry}
        >
          重試
        </button>
      ) : null}
    </div>
  );
}
