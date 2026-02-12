import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getServerCurrentUser } from '../../src/server/session/getServerCurrentUser';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getServerCurrentUser();
  if (!user) redirect('/unauthorized');
  if (user.role !== 'admin') redirect('/forbidden');

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/review" className="rounded border border-slate-200 px-3 py-2 text-sm">
          待審
        </Link>
        <Link href="/admin/taxonomy/categories" className="rounded border border-slate-200 px-3 py-2 text-sm">
          分類
        </Link>
        <Link href="/admin/taxonomy/tags" className="rounded border border-slate-200 px-3 py-2 text-sm">
          標籤
        </Link>
        <Link href="/admin/users" className="rounded border border-slate-200 px-3 py-2 text-sm">
          使用者
        </Link>
        <Link href="/admin/stats" className="rounded border border-slate-200 px-3 py-2 text-sm">
          統計
        </Link>
      </div>
      {children}
    </div>
  );
}
