"use client";

import { BoardCard } from "@/components/BoardCard";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { useBoards } from "@/lib/queries/boards";

export default function HomePage() {
  const q = useBoards();

  if (q.isLoading) return <Loading label="載入看板…" />;
  if (q.isError) return <ErrorBanner error={q.error} />;

  const boards = q.data?.boards ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">看板</h1>
      {boards.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">目前沒有看板</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {boards.map((b) => (
            <BoardCard key={b.id} board={b} />
          ))}
        </div>
      )}
    </div>
  );
}
