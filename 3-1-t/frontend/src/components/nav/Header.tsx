'use client';

import Link from 'next/link';

import { useSession } from '@/services/auth/useSession';

function roleLinks(roles: string[]) {
  const links = [{ href: '/orders', label: 'My Orders' }];

  if (roles.includes('SELLER')) {
    links.push({ href: '/seller/products', label: 'Seller' });
  }
  if (roles.includes('ADMIN')) {
    links.push({ href: '/admin/analytics', label: 'Admin' });
  }

  return links.filter(
    (link, index, array) => array.findIndex((candidate) => candidate.href === link.href) === index,
  );
}

export function Header() {
  const { data, isLoading } = useSession();
  const user = data?.user ?? null;

  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Marketplace
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/search">Search</Link>
          <Link href="/cart">Cart</Link>
          {isLoading ? null : user ? (
            roleLinks(user.roles).map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
