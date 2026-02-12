import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import { useAuth } from '../authStore';

export function LogoutButton() {
  const qc = useQueryClient();
  const { clear } = useAuth();

  const logout = useMutation({
    mutationFn: async () => apiRequest<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      clear();
      await qc.clear();
    },
  });

  return (
    <button
      className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      type="button"
    >
      {logout.isPending ? 'Logging out…' : 'Logout'}
    </button>
  );
}
