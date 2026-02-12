'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/admin/seller-applications', label: '賣家審核' },
  { href: '/admin/categories', label: '分類' },
  { href: '/admin/settlements', label: '結算' },
  { href: '/admin/refunds', label: '退款' },
  { href: '/admin/disputes', label: '糾紛' },
  { href: '/admin/audit-logs', label: '稽核' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + '/');
        return (
          <Link
            key={t.href}
            href={t.href}
            className={
              'rounded px-3 py-2 ' +
              (active ? 'bg-black text-white' : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200')
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
