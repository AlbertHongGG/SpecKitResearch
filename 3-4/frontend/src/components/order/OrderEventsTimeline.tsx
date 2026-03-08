import { formatDateTime } from '../../lib/datetime';

export type OrderStateEventDto = {
  id: string;
  from_status: string;
  to_status: string;
  trigger: string;
  actor_type: string;
  occurred_at: string;
  meta?: unknown | null;
};

export function OrderEventsTimeline(props: { events: OrderStateEventDto[] }) {
  if (props.events.length === 0) {
    return <div className="text-sm text-slate-600">No events</div>;
  }

  return (
    <ol className="space-y-2">
      {props.events.map((e) => (
        <li key={e.id} className="rounded border bg-slate-50 px-3 py-2 text-sm">
          <div className="font-medium">
            {e.from_status} → {e.to_status} ({e.trigger})
          </div>
          <div className="text-slate-600">{formatDateTime(e.occurred_at)}</div>
          {e.meta ? <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(e.meta, null, 2)}</pre> : null}
        </li>
      ))}
    </ol>
  );
}
