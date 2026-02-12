import type { ReactNode } from 'react';

export function LoadingState() {
  return (
    <div className="p-6 text-sm text-slate-600" role="status">
      載入中…
    </div>
  );
}

export function ErrorState(props: { title?: string; children?: ReactNode }) {
  return (
    <div className="p-6">
      <div className="text-sm font-semibold text-rose-700">{props.title ?? '發生錯誤'}</div>
      {props.children ? <div className="mt-2 text-sm text-slate-700">{props.children}</div> : null}
    </div>
  );
}

export function EmptyState(props: { title?: string; children?: ReactNode }) {
  return (
    <div className="p-6">
      <div className="text-sm font-semibold text-slate-800">{props.title ?? '沒有資料'}</div>
      {props.children ? <div className="mt-2 text-sm text-slate-600">{props.children}</div> : null}
    </div>
  );
}

export function ForbiddenState() {
  return <ErrorState title="沒有權限">你沒有權限存取此頁。</ErrorState>;
}

export function NotFoundState() {
  return <ErrorState title="找不到頁面">請確認網址是否正確。</ErrorState>;
}
