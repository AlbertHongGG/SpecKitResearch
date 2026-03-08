import Link from 'next/link';

export function NavLinks({ role }: { role: 'developer' | 'admin' | null }) {
  if (!role) return null;

  const items: Array<{ href: string; label: string }> = [
    { href: '/keys', label: 'Keys' },
    { href: '/docs', label: 'Docs' }
  ];

  if (role === 'admin') {
    items.push({ href: '/admin', label: 'Admin' });
  }

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
