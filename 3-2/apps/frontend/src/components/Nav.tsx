'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

type NavItem = {
  label: string;
  href: string;
};

export function Nav() {
  const q = useQuery({
    queryKey: ['nav'],
    queryFn: async () => {
      return await apiFetch<{ items: NavItem[] }>('/nav');
    },
    retry: false,
  });

  if (q.isLoading || q.isError || !q.data) return null;

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 p-4">
        {q.data.items.map((item) => (
          <Link key={item.href} className="text-sm text-slate-700 hover:underline" href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
