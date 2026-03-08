'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/services', label: 'Services' },
  { href: '/admin/endpoints', label: 'Endpoints' },
  { href: '/admin/scopes', label: 'Scopes' },
  { href: '/admin/scope-rules', label: 'Scope Rules' },
  { href: '/admin/rate-limit', label: 'Rate Limit' },
  { href: '/admin/keys', label: 'Keys' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/usage', label: 'Usage Logs' },
  { href: '/admin/audit', label: 'Audit Logs' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? 'rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50'
                : 'rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
