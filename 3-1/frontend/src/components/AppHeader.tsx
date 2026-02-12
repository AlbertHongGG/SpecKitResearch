'use client';

import Link from 'next/link';
import { useMe, logout } from '../hooks/useMe';
import { Button } from './ui/Button';

export function AppHeader() {
  const me = useMe();
  const roles = me.data?.roles ?? [];
  const isAuthed = Boolean(me.data);
  const isSeller = roles.includes('seller');
  const isAdmin = roles.includes('admin');

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            Marketplace
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/">商品</Link>
            {isAuthed ? (
              <>
                <Link href="/cart">購物車</Link>
                <Link href="/orders">訂單</Link>
              </>
            ) : null}
            {isAuthed && !isSeller && !isAdmin ? <Link href="/seller/apply">申請賣家</Link> : null}
            {isSeller ? <Link href="/seller/products">賣家後台</Link> : null}
            {isAdmin ? <Link href="/admin/seller-applications">管理後台</Link> : null}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {me.isLoading ? null : me.data ? (
            <>
              <span className="text-sm text-neutral-700">{me.data.email}</span>
              <Button
                variant="secondary"
                onClick={async () => {
                  await logout();
                  location.href = '/login';
                }}
              >
                登出
              </Button>
            </>
          ) : (
            <>
              <Link className="text-sm" href="/login">
                登入
              </Link>
              <Link className="text-sm" href="/signup">
                註冊
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
