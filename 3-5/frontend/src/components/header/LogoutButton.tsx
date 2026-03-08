'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { apiFetch } from '@/services/http';

export function LogoutButton() {
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiFetch<void>('/logout', { method: 'POST' });
    },
    onSuccess: () => {
      router.push('/login');
      router.refresh();
    }
  });

  return (
    <button
      type="button"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
    >
      {mutation.isPending ? '登出中…' : '登出'}
    </button>
  );
}
