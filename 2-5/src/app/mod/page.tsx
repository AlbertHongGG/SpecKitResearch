"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { ReportsTable } from "@/components/moderation/ReportsTable";
import { useBoards } from "@/lib/queries/boards";
import { useMe } from "@/lib/queries/auth";

export default function ModPage() {
  const meQ = useMe();
  const boardsQ = useBoards();

  const me = meQ.data;

  const accessibleBoardIds = useMemo(() => {
    if (!me) return [] as string[];
    if (me.user.role === "admin") return boardsQ.data?.boards.map((b) => b.id) ?? [];
    return me.moderatorBoards.map((b) => b.boardId);
  }, [me, boardsQ.data?.boards]);

  const [boardId, setBoardId] = useState<string>(accessibleBoardIds[0] ?? "");

  if (meQ.isLoading || boardsQ.isLoading) return <Loading label="載入管理頁…" />;
  if (boardsQ.isError) return <ErrorBanner error={boardsQ.error} />;

  if (!me) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm">
        <div className="font-medium">需要登入</div>
        <div className="mt-2 text-slate-700">
          <Link className="underline" href="/login">
            前往登入
          </Link>
        </div>
      </div>
    );
  }

  const boards = boardsQ.data!.boards;
  const allowedBoards = boards.filter((b) => accessibleBoardIds.includes(b.id));

  if (allowedBoards.length === 0) {
    return <div className="rounded-lg border bg-white p-4 text-sm text-slate-700">你目前沒有任何看板的 Moderator 權限</div>;
  }

  const selected = boardId && allowedBoards.some((b) => b.id === boardId) ? boardId : allowedBoards[0]!.id;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">Moderator Panel</div>
            <div className="text-sm text-slate-600">依指派看板範圍檢視與處理檢舉</div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">看板</span>
            <select
              className="rounded border bg-white px-2 py-1"
              aria-label="看板"
              value={selected}
              onChange={(e) => setBoardId(e.target.value)}
            >
              {allowedBoards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <ReportsTable boardId={selected} />
    </div>
  );
}
