import { Link, useParams } from 'react-router-dom';
import { useOrderDetailQuery } from '../services/orders';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderEventTimeline } from '../components/OrderEventTimeline';
import { ReturnLogList } from '../components/ReturnLogList';
import { WebhookLogList } from '../components/WebhookLogList';
import { useWebhookResendMutation } from '../services/webhook';
import { useReplayMutation } from '../services/replay';
import { ReplayRunList } from '../components/ReplayRunList';
import { ErrorState, LoadingState } from '../components/States';

export function OrderDetailPage() {
  const params = useParams();
  const id = params.id ?? '';
  const q = useOrderDetailQuery(id);

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState description={(q.error as any)?.message} />;
  if (!q.data) return <ErrorState title="找不到訂單" />;

  const o = q.data;
  const resend = useWebhookResendMutation(o.id);
  const replay = useReplayMutation(o.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-xs text-slate-500">{o.order_no}</div>
          <h1 className="text-xl font-semibold">Order Detail</h1>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={o.status} />
          <Link className="text-sm text-slate-900 underline" to={`/pay/${o.order_no}`}>
            付款頁
          </Link>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <div className="text-sm font-medium">
          {o.amount} {o.currency}
        </div>
        <div className="mt-2 text-sm text-slate-600 break-all">callback: {o.callback_url}</div>
        <div className="mt-1 text-xs text-slate-500">return_method: {o.return_method}</div>
        <div className="mt-1 text-xs text-slate-500">scenario: {o.simulation_scenario}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-2 text-sm font-semibold">State Events</h2>
          <OrderEventTimeline events={o.state_events} />
        </div>
        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-2 text-sm font-semibold">Return Logs</h2>
          <ReturnLogList logs={o.return_logs} />
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Webhook Logs</h2>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            disabled={!o.webhook_url || resend.isPending}
            onClick={() => resend.mutate()}
            title={!o.webhook_url ? '此訂單未設定 webhook_url' : 'Enqueue resend job'}
          >
            {resend.isPending ? 'Resending…' : 'Resend'}
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500 break-all">
          webhook_url: {o.webhook_url ?? '(none)'}
        </div>
        {resend.isError ? (
          <div className="mt-2 text-xs text-rose-700">Resend 失敗</div>
        ) : null}
        <div className="mt-3">
          <WebhookLogList logs={o.webhook_logs} />
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Replay</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 disabled:opacity-50"
              disabled={replay.isPending}
              onClick={() => replay.mutate('webhook_only')}
            >
              Webhook only
            </button>
            <button
              type="button"
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              disabled={replay.isPending}
              onClick={() => replay.mutate('full_flow')}
            >
              Full flow
            </button>
          </div>
        </div>
        {replay.isError ? (
          <div className="mt-2 text-xs text-rose-700">Replay 失敗</div>
        ) : null}
        <div className="mt-3">
          <ReplayRunList runs={o.replay_runs} />
        </div>
      </div>

      <div>
        <Link className="text-sm text-slate-900 underline" to="/orders">
          回到 Orders
        </Link>
      </div>
    </div>
  );
}
