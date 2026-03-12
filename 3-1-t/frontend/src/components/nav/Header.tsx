'use client';

import { startTransition, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/services/api/client';
import { useSession } from '@/services/auth/useSession';

function roleLinks(roles: string[]) {
  const links = [{ href: '/orders', label: 'My Orders' }];

  if (!roles.includes('SELLER')) {
    links.push({ href: '/seller/apply', label: 'Become a Seller' });
  }

  if (roles.includes('SELLER')) {
    links.push(
      { href: '/seller/products', label: 'Seller Products' },
      { href: '/seller/orders', label: 'Seller Orders' },
      { href: '/seller/settlements', label: 'Settlements' },
    );
  }
  if (roles.includes('ADMIN')) {
    links.push(
      { href: '/admin/analytics', label: 'Analytics' },
      { href: '/admin/seller-applications', label: 'Seller Reviews' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/orders', label: 'Admin Orders' },
      { href: '/admin/refunds', label: 'Refunds' },
      { href: '/admin/disputes', label: 'Disputes' },
    );
  }

  return links.filter(
    (link, index, array) => array.findIndex((candidate) => candidate.href === link.href) === index,
  );
}

export function Header() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSession();
  const user = data?.user ?? null;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
            <>
              {roleLinks(user.roles).map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <button
                className="rounded border border-black/15 px-3 py-1"
                disabled={isLoggingOut}
                onClick={async () => {
                  setIsLoggingOut(true);

                  try {
                    await apiRequest('/auth/logout', { method: 'POST' });
                    await queryClient.invalidateQueries({ queryKey: ['session'] });
                    await queryClient.invalidateQueries({ queryKey: ['cart'] });
                    startTransition(() => {
                      router.push('/');
                      router.refresh();
                    });
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
              >
                {isLoggingOut ? 'Signing out...' : 'Logout'}
              </button>
            </>
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
