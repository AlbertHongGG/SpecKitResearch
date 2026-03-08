import type { ReplayRun } from '@app/contracts';

export function ReplayRunList(props: { runs: ReplayRun[] }) {
  if (props.runs.length === 0) {
    return <div className="text-sm text-slate-500">尚無 replay runs</div>;
  }

  return (
    <div className="space-y-2">
      {props.runs.map((r) => (
        <div key={r.id} className="rounded border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[11px] text-slate-700">{r.id}</div>
            <div
              className={
                'text-xs font-medium ' +
                (r.result_status === 'success' ? 'text-emerald-700' : 'text-rose-700')
              }
            >
              {r.result_status.toUpperCase()}
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-500">scope: {r.scope}</div>
          <div className="mt-1 text-xs text-slate-500">started: {new Date(r.started_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
