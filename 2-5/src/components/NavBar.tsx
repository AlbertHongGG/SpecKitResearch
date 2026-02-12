"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogoutMutation, useMe } from "@/lib/queries/auth";

export function NavBar() {
  const router = useRouter();
  const meQ = useMe();
  const logout = useLogoutMutation();

  const me = meQ.data;

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 p-4">
        <Link href="/" className="font-semibold">
          Multi-Role Forum
        </Link>
        <nav className="flex items-center gap-3 text-sm text-slate-600">
          <Link href="/search" className="hover:text-slate-900">
            搜尋
          </Link>

          {me ? (
            <>
              <Link href="/threads/new" className="hover:text-slate-900">
                發文
              </Link>

              {me.user.role === "admin" || me.moderatorBoards.length > 0 ? (
                <Link href="/mod" className="hover:text-slate-900">
                  管理
                </Link>
              ) : null}

              {me.user.role === "admin" ? (
                <Link href="/admin" className="hover:text-slate-900">
                  Admin
                </Link>
              ) : null}

              <button
                className="hover:text-slate-900"
                type="button"
                onClick={async () => {
                  await logout.mutateAsync();
                  router.push("/");
                }}
              >
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-slate-900">
                登入
              </Link>
              <Link href="/register" className="hover:text-slate-900">
                註冊
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
