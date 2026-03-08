import React from 'react';

export function LoadingState(props: { title?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
      {props.title ?? '載入中…'}
    </div>
  );
}

export function ErrorState(props: { title?: string; description?: string }) {
  return (
    <div className="rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div className="font-medium">{props.title ?? '載入失敗'}</div>
      {props.description ? <div className="mt-1 opacity-90">{props.description}</div> : null}
    </div>
  );
}

export function EmptyState(props: { title?: string; description?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="font-medium">{props.title ?? '沒有資料'}</div>
      {props.description ? <div className="mt-1 opacity-80">{props.description}</div> : null}
    </div>
  );
}
