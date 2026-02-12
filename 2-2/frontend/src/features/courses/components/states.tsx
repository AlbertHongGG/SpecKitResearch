'use client';

export function LoadingState() {
  return <div className="text-slate-500">載入中...</div>;
}

export function EmptyState({ message }: { message: string }) {
  return <div className="text-slate-500">{message}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="text-red-600">{message}</div>;
}
