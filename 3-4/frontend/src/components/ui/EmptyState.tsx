import { ReactNode } from 'react';

export function EmptyState(props: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-6 text-center">
      <div className="text-sm font-medium text-slate-900">{props.title}</div>
      {props.description ? <div className="mt-1 text-sm text-slate-600">{props.description}</div> : null}
      {props.action ? <div className="mt-4 flex justify-center">{props.action}</div> : null}
    </div>
  );
}
