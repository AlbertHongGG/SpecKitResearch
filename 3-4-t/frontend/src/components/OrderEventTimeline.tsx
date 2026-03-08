import type { OrderStateEvent } from '@app/contracts';

export function OrderEventTimeline(props: { events: OrderStateEvent[] }) {
  if (!props.events.length) {
    return <div className="text-sm text-slate-500">尚無狀態事件</div>;
  }

  return (
    <ol className="space-y-2">
      {props.events.map((e) => (
        <li key={e.id} className="rounded border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-500">{new Date(e.occurred_at).toLocaleString()}</div>
            <div className="text-xs text-slate-500">trigger: {e.trigger}</div>
            <div className="text-xs text-slate-500">actor: {e.actor_type}</div>
          </div>
          <div className="mt-1 text-sm font-medium text-slate-800">
            {(e.from ?? '∅') + ' → ' + e.to}
          </div>
          {e.meta ? (
            <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
{JSON.stringify(e.meta, null, 2)}
            </pre>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
