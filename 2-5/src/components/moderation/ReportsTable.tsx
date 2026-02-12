"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { Pagination } from "@/components/Pagination";
import { ThreadActions } from "@/components/moderation/ThreadActions";
import { usePostModerationMutation, useResolveReportMutation } from "@/lib/mutations/reports";
import { useReportsByBoard, type ReportListItem } from "@/lib/queries/reports";

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function ReportsTable({ boardId }: { boardId: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");

  const q = useReportsByBoard({ boardId, status, page, pageSize: 20 });
  const resolve = useResolveReportMutation();
  const postMod = usePostModerationMutation();

  if (q.isLoading) return <Loading label="載入檢舉…" />;
  if (q.isError) return <ErrorBanner error={q.error} />;

  const { items, pageInfo } = q.data!;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">檢舉清單</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-600">狀態</div>
          <select
            className="rounded border bg-white px-2 py-1 text-sm"
            aria-label="檢舉狀態"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value as any);
            }}
          >
            <option value="pending">pending</option>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
          </select>
        </div>
      </div>

      {resolve.isError ? <ErrorBanner error={resolve.error} /> : null}
      {postMod.isError ? <ErrorBanner error={postMod.error} /> : null}

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">目前沒有檢舉</div>
      ) : (
        <div className="space-y-3">
          {items.map((it: ReportListItem) => (
            <div key={it.report.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  <Link className="hover:underline" href={`/threads/${it.thread.id}`}>
                    {it.thread.title}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">({it.report.targetType})</span>
                </div>
                <div className="text-xs text-slate-500">{fmt(it.report.createdAt)}</div>
              </div>

              <div className="mt-2 text-sm text-slate-800">
                <div className="text-xs text-slate-600">原因</div>
                <div className="whitespace-pre-wrap">{it.report.reason}</div>
              </div>

              {it.report.targetType === "post" && "post" in it ? (
                <div className="mt-2 rounded border bg-slate-50 p-3 text-sm text-slate-800">
                  <div className="text-xs text-slate-600">回覆摘要</div>
                  <div className="mt-1 whitespace-pre-wrap">{it.post.content}</div>
                  <div className="mt-1 text-xs text-slate-500">狀態：{it.post.status}</div>
                  <div className="mt-2 flex gap-2">
                    {it.post.status === "hidden" ? (
                      <button
                        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
                        disabled={postMod.isPending}
                        type="button"
                        onClick={() => postMod.mutate({ postId: it.post.id, action: "restore" })}
                      >
                        恢復顯示
                      </button>
                    ) : (
                      <button
                        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
                        disabled={postMod.isPending}
                        type="button"
                        onClick={() => postMod.mutate({ postId: it.post.id, action: "hide" })}
                      >
                        隱藏回覆
                      </button>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {it.report.status === "pending" ? (
                  <>
                    <button
                      className="rounded bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-60"
                      disabled={resolve.isPending}
                      type="button"
                      onClick={() => resolve.mutate({ reportId: it.report.id, outcome: "accepted" })}
                    >
                      接受（並隱藏）
                    </button>
                    <button
                      className="rounded border px-3 py-1 text-sm disabled:opacity-60"
                      disabled={resolve.isPending}
                      type="button"
                      onClick={() => resolve.mutate({ reportId: it.report.id, outcome: "rejected" })}
                    >
                      駁回
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-slate-600">已處理：{it.report.status}</div>
                )}
              </div>

              <ThreadActions threadId={it.thread.id} />
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={pageInfo.page}
        pageSize={pageInfo.pageSize}
        total={pageInfo.total}
        onChange={(p) => setPage(p)}
      />
    </div>
  );
}
