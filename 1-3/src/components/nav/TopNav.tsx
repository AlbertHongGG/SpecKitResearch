'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}
    >
      {label}
    </Link>
  );
}

export function TopNav() {
  const router = useRouter();

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Link href="/transactions" className="text-sm font-semibold text-neutral-900">
            Expense Tracker
          </Link>
          <nav className="ml-2 flex items-center gap-1">
            <NavLink href="/transactions" label="帳務" />
            <NavLink href="/reports" label="月報表" />
            <NavLink href="/categories" label="類別" />
          </nav>
        </div>

        <Button variant="secondary" onClick={onLogout}>
          登出
        </Button>
      </div>
    </header>
  );
}
