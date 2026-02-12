'use client';

export function EmptyState(props: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <div className="text-base font-semibold">{props.title}</div>
      {props.description ? <div className="mt-1 text-sm text-zinc-600">{props.description}</div> : null}
      {props.action ? <div className="mt-4">{props.action}</div> : null}
    </div>
  );
}
