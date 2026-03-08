import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getOrderDetail } from '../api/orders';
import { recordClientSignal } from '../api/returns';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

function toQueryString(payload: any): string {
  const p = new URLSearchParams();
  if (payload && typeof payload === 'object') {
    for (const [k, v] of Object.entries(payload)) {
      if (v === undefined) continue;
      p.set(k, v === null ? '' : String(v));
    }
  }
  return p.toString();
}

export function CompletePage() {
  const { orderNo } = useParams();
  const [dispatching, setDispatching] = useState(false);
  const didSignal = useRef(false);

  const q = useQuery({
    queryKey: ['order', orderNo],
    queryFn: () => getOrderDetail(orderNo!),
    enabled: !!orderNo,
    refetchInterval: 1000,
  });

  const latestReturn = useMemo(() => {
    const logs = q.data?.return_logs ?? [];
    return logs[0] ?? null;
  }, [q.data]);

  useEffect(() => {
    if (!latestReturn) return;
    if (didSignal.current) return;
    didSignal.current = true;
    void recordClientSignal(latestReturn.id, 'navigation_started').catch(() => null);
  }, [latestReturn]);

  if (q.isLoading) return <Spinner />;
  if (q.isError)
    return (
      <Alert kind="error" title="Failed to load order">
        {(q.error as any)?.message}
      </Alert>
    );

  const d = q.data!;

  async function dispatchNow() {
    if (!latestReturn) return;
    setDispatching(true);

    try {
      const payload = latestReturn.payload;
      if (d.order.return_method === 'query_string') {
        const url = new URL(d.order.callback_url);
        const qs = toQueryString(payload);
        if (qs) url.search = url.search ? `${url.search}&${qs}` : `?${qs}`;
        window.location.href = url.toString();
      } else {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = d.order.callback_url;
        for (const [k, v] of Object.entries(payload ?? {})) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = k;
          input.value = v === null || v === undefined ? '' : String(v);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        await recordClientSignal(latestReturn.id, 'form_submitted').catch(() => null);
        form.submit();
      }
    } finally {
      setDispatching(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Complete / Return dispatch</h1>
        <div className="text-sm text-slate-600">Order: {d.order.order_no}</div>
      </div>

      <div className="rounded-lg border bg-white p-4 text-sm">
        <div className="mb-1 font-medium">Return target</div>
        <div className="truncate">callback_url: {d.order.callback_url}</div>
        <div>return_method: {d.order.return_method}</div>
      </div>

      {!latestReturn ? (
        <Alert kind="info" title="Waiting for return log">
          No ReturnLog yet. If this is delayed_success, wait for completion.
        </Alert>
      ) : (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          <div className="text-sm">
            <div className="font-medium">Latest ReturnLog</div>
            <div className="text-slate-600">{latestReturn.id}</div>
          </div>

          <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(latestReturn.payload, null, 2)}</pre>

          <Button onClick={dispatchNow} disabled={dispatching}>
            {dispatching ? 'Dispatching…' : 'Dispatch return now'}
          </Button>
        </div>
      )}
    </div>
  );
}
