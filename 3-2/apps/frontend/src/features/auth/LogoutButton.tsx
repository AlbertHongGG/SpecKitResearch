'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { withCsrf, clearCsrfTokenCache } from '@/lib/api/csrf';

export function LogoutButton() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({ method: 'POST' });
      await apiFetch('/auth/logout', init);
    },
    onSuccess: () => {
      clearCsrfTokenCache();
      qc.invalidateQueries({ queryKey: ['session'] });
      window.location.href = '/login';
    },
  });

  return (
    <button
      className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      type="button"
    >
      登出
    </button>
  );
}
