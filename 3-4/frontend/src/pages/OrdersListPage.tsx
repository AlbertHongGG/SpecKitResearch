import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listOrders } from '../api/orders';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { formatDateTime } from '../lib/datetime';

export function OrdersListPage() {
  const q = useQuery({
    queryKey: ['orders', { page: 1 }],
    queryFn: () => listOrders({ page: 1 }),
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <Link to="/orders/new">
          <Button>Create order</Button>
        </Link>
      </div>

      {q.isLoading ? <Spinner /> : null}
      {q.isError ? (
        <Alert kind="error" title="Failed to load orders">
          {(q.error as any)?.message ?? 'Unknown error'}
        </Alert>
      ) : null}

      {q.data ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">Order No</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Scenario</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link className="font-medium text-slate-900 hover:underline" to={`/orders/${o.order_no}`}>
                      {o.order_no}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2">
                    {o.amount} {o.currency}
                  </td>
                  <td className="px-3 py-2">{o.simulation_scenario}</td>
                  <td className="px-3 py-2">{formatDateTime(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
