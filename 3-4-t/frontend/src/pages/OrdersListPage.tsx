import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrdersListQuery } from '../services/orders';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/States';

export function OrdersListPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [scenario, setScenario] = useState('');

  const q = useOrdersListQuery({
    page,
    pageSize,
    status: status || undefined,
    paymentMethod: paymentMethod || undefined,
    scenario: scenario || undefined,
  });

  const items = q.data?.items ?? [];
  const totalPages = q.data?.total_pages ?? 1;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const summary = useMemo(() => {
    if (!q.data) return '';
    return `第 ${q.data.page} / ${q.data.total_pages} 頁，共 ${q.data.total_items} 筆`;
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <Link className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white" to="/orders/new">
          新增訂單
        </Link>
      </div>

      <div className="grid gap-3 rounded border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">status</div>
          <input className="w-full rounded border px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value)} />
        </label>
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">payment_method</div>
          <input
            className="w-full rounded border px-2 py-1"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <div className="mb-1 text-xs text-slate-500">scenario</div>
          <input className="w-full rounded border px-2 py-1" value={scenario} onChange={(e) => setScenario(e.target.value)} />
        </label>
      </div>

      {q.isLoading ? <LoadingState /> : null}
      {q.isError ? <ErrorState description={(q.error as any)?.message} /> : null}

      <div className="rounded border border-slate-200 bg-white">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">order_no</th>
                <th className="px-3 py-2 text-left">amount</th>
                <th className="px-3 py-2 text-left">status</th>
                <th className="px-3 py-2 text-left">scenario</th>
                <th className="px-3 py-2 text-left">created</th>
                <th className="px-3 py-2 text-left">actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{o.order_no}</td>
                  <td className="px-3 py-2">
                    {o.amount} {o.currency}
                  </td>
                  <td className="px-3 py-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-3 py-2">{o.simulation_scenario}</td>
                  <td className="px-3 py-2">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-3">
                      <Link className="text-slate-900 underline" to={`/orders/${o.id}`}>
                        詳情
                      </Link>
                      <Link className="text-slate-900 underline" to={`/pay/${o.order_no}`}>
                        付款頁
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && !q.isLoading && !q.isError ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                    <EmptyState />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 p-3">
          <div className="text-xs text-slate-500">{summary}</div>
          <div className="flex gap-2">
            <button
              className="rounded border px-2 py-1 text-sm disabled:opacity-50"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              className="rounded border px-2 py-1 text-sm disabled:opacity-50"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
