import React from 'react';

export function Alert(props: { kind?: 'info' | 'error' | 'success'; title?: string; children: React.ReactNode }) {
  const kind = props.kind ?? 'info';
  const styles =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-900'
      : kind === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
        : 'border-slate-200 bg-slate-50 text-slate-900';

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {props.title ? <div className="mb-1 font-medium">{props.title}</div> : null}
      <div>{props.children}</div>
    </div>
  );
}
