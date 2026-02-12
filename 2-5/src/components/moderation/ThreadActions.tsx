"use client";

import { ErrorBanner } from "@/components/ErrorBanner";
import { useThreadModerationMutation } from "@/lib/mutations/reports";
import { useThread } from "@/lib/queries/threads";

export function ThreadActions({ threadId }: { threadId: string }) {
  const threadQ = useThread(threadId);
  const mod = useThreadModerationMutation();

  if (threadQ.isLoading) return <div className="text-xs text-slate-500">載入主題狀態…</div>;
  if (threadQ.isError) return <ErrorBanner error={threadQ.error} />;

  const { thread, viewer } = threadQ.data!;
  if (!viewer.canModerate) return <div className="text-xs text-slate-500">你沒有治理權限</div>;

  const busy = mod.isPending;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {thread.status === "hidden" ? (
        <button
          className="rounded border px-2 py-1 text-xs disabled:opacity-60"
          disabled={busy}
          type="button"
          onClick={() => mod.mutate({ threadId, action: "restore" })}
        >
          恢復顯示
        </button>
      ) : (
        <button
          className="rounded border px-2 py-1 text-xs disabled:opacity-60"
          disabled={busy}
          type="button"
          onClick={() => mod.mutate({ threadId, action: "hide" })}
        >
          隱藏
        </button>
      )}

      {thread.status === "locked" ? (
        <button
          className="rounded border px-2 py-1 text-xs disabled:opacity-60"
          disabled={busy}
          type="button"
          onClick={() => mod.mutate({ threadId, action: "unlock" })}
        >
          解鎖
        </button>
      ) : (
        <button
          className="rounded border px-2 py-1 text-xs disabled:opacity-60"
          disabled={busy}
          type="button"
          onClick={() => mod.mutate({ threadId, action: "lock" })}
        >
          鎖定
        </button>
      )}

      <button
        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
        disabled={busy}
        type="button"
        onClick={() => mod.mutate({ threadId, action: "pinned", pinned: !thread.isPinned })}
      >
        {thread.isPinned ? "取消置頂" : "置頂"}
      </button>

      <button
        className="rounded border px-2 py-1 text-xs disabled:opacity-60"
        disabled={busy}
        type="button"
        onClick={() => mod.mutate({ threadId, action: "featured", featured: !thread.isFeatured })}
      >
        {thread.isFeatured ? "取消精選" : "精選"}
      </button>

      {mod.isError ? <div className="w-full"><ErrorBanner error={mod.error} /></div> : null}
    </div>
  );
}
