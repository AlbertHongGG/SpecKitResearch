'use client';

export function LoadingState({ label = '載入中…' }: { label?: string }) {
  return <div className="p-6 text-slate-600">{label}</div>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="p-6">
      <div className="text-lg font-semibold">{title}</div>
      {description ? <div className="mt-1 text-slate-600">{description}</div> : null}
    </div>
  );
}

export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="p-6">
      <div className="text-lg font-semibold text-red-600">{title}</div>
      {message ? <div className="mt-1 text-slate-700">{message}</div> : null}
    </div>
  );
}
