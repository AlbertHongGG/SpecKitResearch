import type { ReturnLog } from '@app/contracts';

export function ReturnLogList(props: { logs: ReturnLog[] }) {
  if (!props.logs.length) {
    return <div className="text-sm text-slate-500">尚無 ReturnLog</div>;
  }

  return (
    <div className="space-y-3">
      {props.logs.map((l) => (
        <div key={l.id} className="rounded border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-slate-500">{new Date(l.dispatched_at).toLocaleString()}</div>
            <div className="text-xs text-slate-500">method: {l.delivery_method}</div>
            <div className={`text-xs font-medium ${l.success ? 'text-emerald-700' : 'text-rose-700'}`}>
              {l.success ? 'success' : 'fail'}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-600 break-all">callback: {l.callback_url}</div>
          <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
{JSON.stringify(l.payload, null, 2)}
          </pre>
          {l.error_message ? <div className="mt-2 text-xs text-rose-700">{l.error_message}</div> : null}
        </div>
      ))}
    </div>
  );
}
