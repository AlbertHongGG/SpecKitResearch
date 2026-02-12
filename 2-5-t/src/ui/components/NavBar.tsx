"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/src/ui/auth/useSession";
import { logout } from "@/src/ui/auth/logout";
import { Button } from "@/src/ui/components/Button";

export function NavBar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useSession();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session", "me"] });
      router.push("/");
      router.refresh();
    },
  });

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold">
          Forum
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/search" className="hover:underline">
            搜尋
          </Link>
          {data?.authenticated ? (
            <>
              {data.user?.role === "admin" ? (
                <Link href="/admin" className="hover:underline">
                  後台
                </Link>
              ) : null}
              {(data.user?.role === "admin" || (data.moderatorBoards?.length ?? 0) > 0) ? (
                <Link href="/mod" className="hover:underline">
                  治理
                </Link>
              ) : null}
              <span className="text-gray-600">{data.user?.email}</span>
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                登出
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                登入
              </Link>
              <Link href="/register" className="hover:underline">
                註冊
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
