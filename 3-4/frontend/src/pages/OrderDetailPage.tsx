import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getOrderDetail } from '../api/orders';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { formatDateTime } from '../lib/datetime';
import { OrderEventsTimeline } from '../components/order/OrderEventsTimeline';
import { LogsTable } from '../components/order/LogsTable';
import { ResendWebhookButton } from '../components/order/ResendWebhookButton';
import { ReplayControls } from '../components/order/ReplayControls';

export function OrderDetailPage() {
  const { orderNo } = useParams();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['order', orderNo],
    queryFn: () => getOrderDetail(orderNo!),
    enabled: !!orderNo,
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError)
    return (
      <Alert kind="error" title="Failed to load order">
        {(q.error as any)?.message}
      </Alert>
    );

  const d = q.data!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{d.order.order_no}</h1>
          <div className="text-sm text-slate-600">
            {d.order.status} · {d.order.amount} {d.order.currency} · {d.order.simulation_scenario}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/pay/${d.order.order_no}`}>
            <Button variant="secondary">Open pay page</Button>
          </Link>
          <ResendWebhookButton
            orderNo={d.order.order_no}
            onSuccess={() => qc.invalidateQueries({ queryKey: ['order', orderNo] })}
          />
          <ReplayControls orderNo={d.order.order_no} onSuccess={() => qc.invalidateQueries({ queryKey: ['order', orderNo] })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-white p-3 text-sm">
          <div className="mb-1 font-medium">Return</div>
          <div className="text-slate-700">method: {d.order.return_method}</div>
          <div className="truncate text-slate-700">callback: {d.order.callback_url}</div>
          <div className="mt-2">
            <Link className="text-slate-900 underline" to={`/complete/${d.order.order_no}`}>
              Open complete/dispatch page
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-3 text-sm">
          <div className="mb-1 font-medium">Webhook</div>
          <div className="truncate text-slate-700">url: {d.order.webhook_url ?? '-'}</div>
          <div className="text-slate-700">endpoint_id: {d.order.webhook_endpoint_id ?? '-'}</div>
        </div>
      </div>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-3 py-2 font-medium">State events</div>
        <div className="p-3 text-sm">
          <OrderEventsTimeline events={d.state_events} />
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-3 py-2 font-medium">Return logs</div>
        <div className="p-3 text-sm">
          <LogsTable
            items={d.return_logs}
            emptyText="No return logs"
            columns={[
              { header: 'Initiated', cell: (r: any) => formatDateTime(r.initiated_at) },
              { header: 'Success', cell: (r: any) => String(r.success) },
              {
                header: 'Replay',
                cell: (r: any) => (r.replay_run_id ? <span className="font-mono text-xs">{r.replay_run_id}</span> : '-'),
              },
              { header: 'Client signal', cell: (r: any) => (r.client_signal_at ? formatDateTime(r.client_signal_at) : '-') },
              { header: 'Ack', cell: (r: any) => (r.ack_at ? formatDateTime(r.ack_at) : '-') },
              {
                header: 'Payload',
                className: 'max-w-[360px]',
                cell: (r: any) => <pre className="overflow-auto text-xs">{JSON.stringify(r.payload, null, 2)}</pre>,
              },
            ]}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-3 py-2 font-medium">Webhook logs</div>
        <div className="p-3 text-sm">
          <LogsTable
            items={d.webhook_logs}
            emptyText="No webhook logs"
            columns={[
              { header: 'Sent', cell: (w: any) => formatDateTime(w.sent_at) },
              { header: 'Success', cell: (w: any) => String(w.success) },
              {
                header: 'Replay',
                cell: (w: any) => (w.replay_run_id ? <span className="font-mono text-xs">{w.replay_run_id}</span> : '-'),
              },
              { header: 'Status', cell: (w: any) => (w.response_status ?? '-') },
              { header: 'Event', cell: (w: any) => <span className="font-mono text-xs">{w.event_id}</span> },
              { header: 'URL', className: 'max-w-[360px]', cell: (w: any) => <div className="truncate">{w.url}</div> },
            ]}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-3 py-2 font-medium">Replay runs</div>
        <div className="p-3 text-sm">
          {d.replay_runs.length === 0 ? (
            <div className="text-slate-600">No replay runs</div>
          ) : (
            <ul className="space-y-2">
              {d.replay_runs.map((r) => (
                <li key={r.id} className="rounded border bg-slate-50 px-3 py-2">
                  <div className="font-medium">{r.id}</div>
                  <div className="text-slate-700">scope: {r.scope}</div>
                  <div className="text-slate-700">status: {r.status}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="border-b px-3 py-2 font-medium">Audit logs</div>
        <div className="p-3 text-sm">
          <LogsTable
            items={d.audit_logs}
            emptyText="No audit logs"
            columns={[
              { header: 'Time', cell: (a: any) => formatDateTime(a.created_at) },
              { header: 'Action', cell: (a: any) => a.action },
              {
                header: 'Meta',
                className: 'max-w-[360px]',
                cell: (a: any) => (a.meta ? <pre className="overflow-auto text-xs">{JSON.stringify(a.meta, null, 2)}</pre> : '-'),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
