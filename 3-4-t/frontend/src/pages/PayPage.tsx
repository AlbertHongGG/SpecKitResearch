import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePayMutation, usePayPageLoadQuery } from '../services/orders';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { OrderEventTimeline } from '../components/OrderEventTimeline';
import { ReturnLogList } from '../components/ReturnLogList';

export function PayPage() {
  const params = useParams();
  const orderNo = params.order_no ?? '';
  const q = usePayPageLoadQuery(orderNo);
  const pay = usePayMutation(orderNo);

  const error = useMemo(() => {
    if (!q.isError) return '';
    return (q.error as any)?.message ?? '載入失敗';
  }, [q.isError, q.error]);

  const payError = useMemo(() => {
    if (!pay.isError) return '';
    return (pay.error as any)?.message ?? '付款失敗';
  }, [pay.isError, pay.error]);

  const order = q.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">付款頁</h1>
        <Link className="text-sm text-slate-900 underline" to="/orders">
          回到 Orders
        </Link>
      </div>

      {q.isLoading ? <div className="text-sm text-slate-500">載入中…</div> : null}
      {error ? <div className="text-sm text-rose-700">{error}</div> : null}

      {order ? (
        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-xs text-slate-500">{order.order_no}</div>
              <div className="mt-1 text-lg font-semibold">
                {order.amount} {order.currency}
              </div>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="mt-3 text-sm text-slate-600 break-all">callback: {order.callback_url}</div>

          {payError ? <div className="mt-3 text-sm text-rose-700">{payError}</div> : null}

          <div className="mt-4 flex gap-2">
            <button
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={pay.isPending || order.status !== 'payment_pending'}
              onClick={async () => {
                const res = await pay.mutateAsync();
                const rd = res.return_dispatch;
                if (rd.redirect_url) {
                  window.location.href = rd.redirect_url;
                  return;
                }
                if (rd.form_html) {
                  document.open();
                  document.write(rd.form_html);
                  document.close();
                }
              }}
            >
              {pay.isPending ? '處理中…' : 'Pay'}
            </button>
            {order.status !== 'payment_pending' ? (
              <div className="self-center text-xs text-slate-500">（狀態非 payment_pending，無法付款）</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {order ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-2 text-sm font-semibold">State Events</h2>
            <OrderEventTimeline events={order.state_events} />
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-2 text-sm font-semibold">Return Logs</h2>
            <ReturnLogList logs={order.return_logs} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
