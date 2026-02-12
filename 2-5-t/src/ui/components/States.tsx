"use client";

import { presentError } from "@/src/ui/errors/errorPresenter";

export function LoadingState({ label = "載入中…" }: { label?: string }) {
  return <div className="py-6 text-sm text-neutral-600">{label}</div>;
}

export function EmptyState({ title = "沒有資料", description }: { title?: string; description?: string }) {
  return (
    <div className="mt-6 rounded-md border bg-white px-4 py-8">
      <div className="text-sm font-medium text-neutral-900">{title}</div>
      {description ? <div className="mt-2 text-sm text-neutral-600">{description}</div> : null}
    </div>
  );
}

export function ErrorState({ error, title = "發生錯誤" }: { error: unknown; title?: string }) {
  const presented = presentError(error);
  return (
    <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-8">
      <div className="text-sm font-medium text-red-900">{title}</div>
      <div className="mt-2 text-sm text-red-700">{presented.userMessage}</div>
      {process.env.NODE_ENV !== "production" && presented.devMessage ? (
        <div className="mt-2 text-xs text-red-700 opacity-80">{presented.devMessage}</div>
      ) : null}
    </div>
  );
}
