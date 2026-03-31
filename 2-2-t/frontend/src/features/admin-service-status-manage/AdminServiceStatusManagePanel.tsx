import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiGetJson, apiPostNoContent } from '../../api/http';
import { ServicesListResponseSchema } from '../../api/schemas';

export function AdminServiceStatusManagePanel() {
  const qc = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['admin-services'],
    queryFn: () => apiGetJson('/admin/services', ServicesListResponseSchema),
  });

  const inactivateMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await apiPostNoContent(`/admin/services/${serviceId}/inactivate`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await apiPostNoContent(`/admin/services/${serviceId}/activate`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  if (servicesQuery.isLoading) return <div className="text-sm">Loading...</div>;

  if (servicesQuery.isError) {
    const error = servicesQuery.error as unknown;
    const msg = error instanceof ApiError ? error.message : 'Error loading services.';
    return (
      <div>
        <p className="text-sm text-red-700">{msg}</p>
        <button
          type="button"
          className="mt-3 rounded border px-3 py-2 text-sm"
          onClick={() => servicesQuery.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const items = servicesQuery.data?.items ?? [];

  if (items.length === 0) {
    return <p className="text-sm text-gray-600">No services found.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((s) => {
        const inactivatingThis = inactivateMutation.isPending && inactivateMutation.variables === s.id;
        const activatingThis = activateMutation.isPending && activateMutation.variables === s.id;
        const busy = inactivatingThis || activatingThis;

        return (
          <li key={s.id} className="rounded border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 text-xs text-gray-600">
                  Status: {s.status} · Provider: {s.providerId}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  disabled={busy || s.status === 'INACTIVE'}
                  onClick={() => inactivateMutation.mutate(s.id)}
                >
                  {inactivatingThis ? 'Inactivating...' : 'Inactivate'}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  disabled={busy || s.status === 'ACTIVE'}
                  onClick={() => activateMutation.mutate(s.id)}
                >
                  {activatingThis ? 'Activating...' : 'Activate'}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
