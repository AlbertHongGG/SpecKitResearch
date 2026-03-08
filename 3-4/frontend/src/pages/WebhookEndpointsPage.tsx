import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listWebhookEndpoints, rotateWebhookSecret } from '../api/webhookEndpoints';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

export function WebhookEndpointsPage() {
  const qc = useQueryClient();
  const [revealed, setRevealed] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['webhook-endpoints'],
    queryFn: () => listWebhookEndpoints(),
  });

  const rotate = useMutation({
    mutationFn: (endpointId: string) => rotateWebhookSecret(endpointId),
    onSuccess: async (d) => {
      setRevealed(d.signing_secret_current);
      await qc.invalidateQueries({ queryKey: ['webhook-endpoints'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Webhook endpoints</h1>

      {revealed ? (
        <Alert kind="success" title="New signing secret (shown once)">
          <div className="break-all font-mono text-xs">{revealed}</div>
        </Alert>
      ) : null}

      {q.isLoading ? <Spinner /> : null}
      {q.isError ? (
        <Alert kind="error" title="Failed to load endpoints">
          {(q.error as any)?.message}
        </Alert>
      ) : null}

      {q.data ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">URL</th>
                <th className="px-3 py-2">Masked</th>
                <th className="px-3 py-2">Rotate</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{e.url}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.secret_masked ?? '-'}</td>
                  <td className="px-3 py-2">
                    <Button variant="secondary" onClick={() => rotate.mutate(e.id)} disabled={rotate.isPending}>
                      Rotate
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
