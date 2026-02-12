'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/seller/products', label: '商品' },
  { href: '/seller/orders', label: '訂單' },
  { href: '/seller/refunds', label: '退款' },
  { href: '/seller/settlements', label: '結算' },
];

export function SellerNav() {
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
