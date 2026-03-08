import { ReactNode } from 'react';

export function LoadingState({ text = '載入中...' }: { text?: string }) {
  return <div className="card text-sm text-gray-600">{text}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="card space-y-2">
      <p className="text-sm text-red-600">{message}</p>
      {retry ? (
        <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={retry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-600">{title}</p>
      {action}
    </div>
  );
}
