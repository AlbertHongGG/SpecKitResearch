"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { Pagination } from "@/components/Pagination";
import { ThreadCard } from "@/components/ThreadCard";
import { useBoard } from "@/lib/queries/boards";
import { useThreadsByBoard } from "@/lib/queries/threads";

export default function BoardPage({ params }: { params: { id: string } }) {
  const boardId = params.id;
  const router = useRouter();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page") ?? "1"));

  const boardQ = useBoard(boardId);
  const threadsQ = useThreadsByBoard(boardId, page);

  if (boardQ.isLoading || threadsQ.isLoading) return <Loading label="載入中…" />;
  if (boardQ.isError) return <ErrorBanner error={boardQ.error} />;
  if (threadsQ.isError) return <ErrorBanner error={threadsQ.error} />;

  const board = boardQ.data!.board;
  const items = threadsQ.data!.items;
  const pageInfo = threadsQ.data!.pageInfo;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{board.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{board.description}</p>
        {!board.isActive && (
          <div className="mt-2 rounded border bg-amber-50 p-3 text-sm text-amber-900">
            此看板已停用：目前僅支援唯讀瀏覽
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">目前沒有主題</div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <ThreadCard key={t.id} thread={t} />
          ))}
        </div>
      )}

      <Pagination
        page={pageInfo.page}
        pageSize={pageInfo.pageSize}
        total={pageInfo.total}
        onChange={(p) => router.push(`/boards/${boardId}?page=${p}`)}
      />
    </div>
  );
}
