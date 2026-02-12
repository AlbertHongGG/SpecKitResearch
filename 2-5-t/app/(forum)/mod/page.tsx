"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/src/ui/auth/useSession";
import { apiFetch } from "@/src/ui/api/client";
import { PageShell } from "@/src/ui/components/PageShell";
import { LoadingState } from "@/src/ui/components/States";

type Board = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export default function ModHomePage() {
  const { data: session, isLoading: sessionLoading } = useSession();

  const boardsQuery = useQuery({
    queryKey: ["boards"],
    queryFn: async () => apiFetch<{ boards: Board[] }>("/api/boards", { method: "GET" }),
    enabled: !!session?.authenticated,
  });

  if (sessionLoading) {
    return (
      <PageShell title="治理面板">
        <LoadingState />
      </PageShell>
    );
  }

  if (!session?.authenticated) {
    return (
      <PageShell title="治理面板">
        <p className="mt-4 text-sm text-neutral-700">需要登入。</p>
        <Link className="mt-2 inline-block text-sm text-blue-700 hover:underline" href="/login?returnTo=/mod">
          前往登入
        </Link>
      </PageShell>
    );
  }

  const actorBoards = session.user?.role === "admin" ? null : new Set(session.moderatorBoards ?? []);
  const visibleBoards = (boardsQuery.data?.boards ?? []).filter((b) => !actorBoards || actorBoards.has(b.id));

  return (
    <PageShell title="治理面板">
      <p className="mt-2 text-sm text-neutral-600">選擇看板以檢視檢舉。</p>

      <div className="mt-6 grid gap-3">
        {visibleBoards.map((b) => (
          <Link
            key={b.id}
            href={`/mod/boards/${b.id}/reports`}
            className="rounded-md border bg-white px-4 py-3 hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{b.name}</div>
              {!b.isActive ? (
                <span className="rounded bg-neutral-200 px-2 py-1 text-xs text-neutral-700">Inactive</span>
              ) : null}
            </div>
            {b.description ? <div className="mt-1 text-xs text-neutral-600">{b.description}</div> : null}
          </Link>
        ))}
        {visibleBoards.length === 0 ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">
            你目前沒有可治理的看板。
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}
