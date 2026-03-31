import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiGetJson, apiPostNoContent } from '../../api/http';
import { AdminUsersListResponseSchema } from '../../api/schemas';

export function AdminUserStatusManagePanel() {
  const qc = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiGetJson('/admin/users', AdminUsersListResponseSchema),
  });

  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiPostNoContent(`/admin/users/${userId}/suspend`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiPostNoContent(`/admin/users/${userId}/activate`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  if (usersQuery.isLoading) return <div className="text-sm">Loading...</div>;

  if (usersQuery.isError) {
    const error = usersQuery.error as unknown;
    const msg = error instanceof ApiError ? error.message : 'Error loading users.';
    return (
      <div>
        <p className="text-sm text-red-700">{msg}</p>
        <button
          type="button"
          className="mt-3 rounded border px-3 py-2 text-sm"
          onClick={() => usersQuery.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const items = usersQuery.data?.items ?? [];

  if (items.length === 0) {
    return <p className="text-sm text-gray-600">No users found.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((u) => {
        const suspendingThis = suspendMutation.isPending && suspendMutation.variables === u.id;
        const activatingThis = activateMutation.isPending && activateMutation.variables === u.id;
        const busy = suspendingThis || activatingThis;

        return (
          <li key={u.id} className="rounded border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">{u.email}</div>
                <div className="mt-1 text-xs text-gray-600">
                  Role: {u.role} · Status: {u.status}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  disabled={busy || u.status === 'SUSPENDED'}
                  onClick={() => suspendMutation.mutate(u.id)}
                >
                  {suspendingThis ? 'Suspending...' : 'Suspend'}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm disabled:opacity-50"
                  disabled={busy || u.status === 'ACTIVE'}
                  onClick={() => activateMutation.mutate(u.id)}
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
