import type { WebhookLog } from '@app/contracts';

export function WebhookLogList(props: { logs: WebhookLog[] }) {
  if (props.logs.length === 0) {
    return <div className="text-sm text-slate-500">尚無 webhook logs</div>;
  }

  return (
    <div className="space-y-2">
      {props.logs
        .slice()
        .reverse()
        .map((l) => (
          <div key={l.id} className="rounded border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">{new Date(l.sent_at).toLocaleString()}</div>
              <div
                className={
                  'text-xs font-medium ' +
                  (l.success ? 'text-emerald-700' : 'text-rose-700')
                }
              >
                {l.success ? 'SUCCESS' : 'FAIL'}
                {l.response_status != null ? ` (${l.response_status})` : ''}
              </div>
            </div>
            <div className="mt-2 font-mono text-[11px] text-slate-700 break-all">{l.request_url}</div>
            {l.response_body_excerpt ? (
              <div className="mt-2 text-[11px] text-slate-600 break-all">
                {l.response_body_excerpt}
              </div>
            ) : null}
          </div>
        ))}
    </div>
  );
}
