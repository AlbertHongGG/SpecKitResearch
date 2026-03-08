import { useMutation } from '@tanstack/react-query';
import { createReplay } from '../../api/orders';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function ReplayControls(props: { orderNo: string; onSuccess?: () => void }) {
  const m = useMutation({
    mutationFn: (scope: 'webhook_only' | 'full_flow') => createReplay(props.orderNo, scope),
    onSuccess: async () => {
      props.onSuccess?.();
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => m.mutate('webhook_only')} disabled={m.isPending}>
          Replay webhook
        </Button>
        <Button variant="secondary" onClick={() => m.mutate('full_flow')} disabled={m.isPending}>
          Replay full flow
        </Button>
      </div>
      {m.isError ? (
        <div className="mt-2">
          <Alert kind="error" title="Replay failed">
            {(m.error as any)?.message ?? 'Unknown error'}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
