import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { enterPayPage, simulatePay } from '../api/orders';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';

export function PayPage() {
  const { orderNo } = useParams();
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);

  const enter = useMutation({
    mutationFn: () => enterPayPage(orderNo!),
    onSuccess: () => setEntered(true),
  });

  const simulate = useMutation({
    mutationFn: () => simulatePay(orderNo!),
    onSuccess: (d) => {
      navigate(d.return_dispatch_url);
    },
  });

  useEffect(() => {
    if (!orderNo) return;
    if (entered) return;
    if (enter.isPending) return;
    enter.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pay</h1>
        <div className="text-sm text-slate-600">Order: {orderNo}</div>
      </div>

      {enter.isPending ? <Spinner label="Entering payment page…" /> : null}
      {enter.isError ? (
        <Alert kind="error" title="Enter payment page failed">
          {(enter.error as any)?.message}
        </Alert>
      ) : null}

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-2 text-sm text-slate-700">Simulate payment (server will complete based on scenario)</div>
        <Button onClick={() => simulate.mutate()} disabled={!entered || simulate.isPending}>
          {simulate.isPending ? 'Simulating…' : 'Simulate'}
        </Button>
      </div>

      {simulate.isError ? (
        <Alert kind="error" title="Simulate failed">
          {(simulate.error as any)?.message}
        </Alert>
      ) : null}
    </div>
  );
}
