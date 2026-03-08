import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminListScenarioTemplates, adminUpdateScenarioTemplate } from '../../api/admin';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

export function ScenarioTemplatesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'scenario-templates'], queryFn: () => adminListScenarioTemplates() });

  const toggle = useMutation({
    mutationFn: (input: { scenario: any; enabled: boolean }) => adminUpdateScenarioTemplate(input.scenario, { enabled: input.enabled }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'scenario-templates'] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Scenario templates</h1>

      {q.isLoading ? <Spinner /> : null}
      {q.isError ? (
        <Alert kind="error" title="Failed to load">
          {(q.error as any)?.message}
        </Alert>
      ) : null}

      {q.data ? (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2">Scenario</th>
                <th className="px-3 py-2">Enabled</th>
                <th className="px-3 py-2">Default delay</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {q.data.items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{s.scenario}</td>
                  <td className="px-3 py-2">{String(s.enabled)}</td>
                  <td className="px-3 py-2">{s.default_delay_sec}</td>
                  <td className="px-3 py-2">
                    <Button
                      variant="secondary"
                      onClick={() => toggle.mutate({ scenario: s.scenario, enabled: !s.enabled })}
                      disabled={toggle.isPending}
                    >
                      Toggle
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
