import { useMutation } from '@tanstack/react-query';
import { resendWebhook } from '../../api/orders';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

export function ResendWebhookButton(props: { orderNo: string; onSuccess?: () => void }) {
  const m = useMutation({
    mutationFn: () => resendWebhook(props.orderNo),
    onSuccess: async () => {
      props.onSuccess?.();
    },
  });

  return (
    <div>
      <Button variant="secondary" onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? 'Resending…' : 'Resend webhook'}
      </Button>
      {m.isError ? (
        <div className="mt-2">
          <Alert kind="error" title="Resend failed">
            {(m.error as any)?.message ?? 'Unknown error'}
          </Alert>
        </div>
      ) : null}
    </div>
  );
}
