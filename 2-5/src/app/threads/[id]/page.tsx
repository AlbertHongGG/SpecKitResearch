"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { ReportDialog } from "@/components/modals/ReportDialog";
import { Pagination } from "@/components/Pagination";
import { ReplyForm } from "@/components/forms/ReplyForm";
import { useToggleThreadFavorite, useToggleThreadLike } from "@/lib/mutations/reactions";
import { usePublishThreadMutation } from "@/lib/mutations/threads";
import { useMe } from "@/lib/queries/auth";
import { usePostsByThread } from "@/lib/queries/posts";
import { useThread } from "@/lib/queries/threads";

export default function ThreadPage({ params }: { params: { id: string } }) {
  const threadId = params.id;
  const router = useRouter();
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page") ?? "1"));

  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ targetType: "thread" | "post"; targetId: string } | null>(null);

  const threadQ = useThread(threadId);
  const postsQ = usePostsByThread(threadId, page);
  const meQ = useMe();

  const like = useToggleThreadLike(threadId);
  const fav = useToggleThreadFavorite(threadId);
  const publish = usePublishThreadMutation();

  if (threadQ.isLoading || postsQ.isLoading) return <Loading label="載入主題…" />;
  if (threadQ.isError) return <ErrorBanner error={threadQ.error} />;
  if (postsQ.isError) return <ErrorBanner error={postsQ.error} />;

  const { thread, viewer, reactions, board } = threadQ.data!;
  const items = postsQ.data!.items;
  const pageInfo = postsQ.data!.pageInfo;

  const canReportThread = !!meQ.data && board.isActive && thread.status !== "draft" && thread.status !== "hidden";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <h1 className="text-xl font-semibold">{thread.title}</h1>
        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{thread.content}</div>
        <div className="mt-3 text-xs text-slate-500">狀態：{thread.status}</div>

        {meQ.data ? (
          board.isActive ? (
            <div className="mt-4 flex gap-2">
              {viewer.canEdit && thread.status === "draft" ? (
                <button
                  className="rounded bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-60"
                  disabled={publish.isPending}
                  onClick={async () => {
                    await publish.mutateAsync(threadId);
                  }}
                  type="button"
                >
                  {publish.isPending ? "發布中…" : "發布"}
                </button>
              ) : null}

              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-60"
                disabled={like.isPending}
                onClick={() => like.mutate(!reactions.liked)}
                type="button"
              >
                {reactions.liked ? "取消讚" : "讚"}
              </button>
              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-60"
                disabled={fav.isPending}
                onClick={() => fav.mutate(!reactions.favorited)}
                type="button"
              >
                {reactions.favorited ? "取消收藏" : "收藏"}
              </button>

              <button
                className="rounded border px-3 py-1 text-sm disabled:opacity-60"
                disabled={!canReportThread}
                onClick={() => {
                  setReportTarget({ targetType: "thread", targetId: threadId });
                  setReportOpen(true);
                }}
                type="button"
              >
                檢舉
              </button>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-600">看板已停用，無法互動</div>
          )
        ) : (
          <div className="mt-4 text-sm text-slate-600">登入後可按讚 / 收藏 / 回覆</div>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">目前沒有回覆</div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="rounded-lg border bg-white p-4">
              {meQ.data && board.isActive && p.status === "visible" ? (
                <div className="mb-2 flex justify-end">
                  <button
                    className="rounded border px-2 py-1 text-xs text-slate-700"
                    type="button"
                    onClick={() => {
                      setReportTarget({ targetType: "post", targetId: p.id });
                      setReportOpen(true);
                    }}
                  >
                    檢舉回覆
                  </button>
                </div>
              ) : null}
              <div className="whitespace-pre-wrap text-sm text-slate-800">{p.content}</div>
              <div className="mt-2 text-xs text-slate-500">狀態：{p.status}</div>
            </div>
          ))
        )}
      </div>

      <Pagination
        page={pageInfo.page}
        pageSize={pageInfo.pageSize}
        total={pageInfo.total}
        onChange={(p) => router.push(`/threads/${threadId}?page=${p}`)}
      />

      {meQ.data ? (
        viewer.canReply ? (
          <ReplyForm threadId={threadId} />
        ) : (
          <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
            {board.isActive ? (thread.status === "locked" ? "此主題已鎖定，無法回覆" : "目前無法回覆") : "看板已停用，無法互動"}
          </div>
        )
      ) : null}

      <ReportDialog
        open={reportOpen && !!reportTarget}
        targetType={reportTarget?.targetType ?? "thread"}
        targetId={reportTarget?.targetId ?? threadId}
        onClose={() => {
          setReportOpen(false);
          setReportTarget(null);
        }}
      />
    </div>
  );
}
