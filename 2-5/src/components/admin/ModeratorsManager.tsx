"use client";

import { useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { useAdminBoards, useAdminSetModeratorMutation } from "@/lib/queries/admin";

export function ModeratorsManager() {
  const boardsQ = useAdminBoards();
  const mut = useAdminSetModeratorMutation();

  const boards = useMemo(() => boardsQ.data?.boards ?? [], [boardsQ.data?.boards]);

  const [boardId, setBoardId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [action, setAction] = useState<"assign" | "remove">("assign");

  if (boardsQ.isLoading) return <Loading label="載入看板…" />;
  if (boardsQ.isError) return <ErrorBanner error={boardsQ.error} />;

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">Moderator 指派</div>
      {mut.isError ? <ErrorBanner error={mut.error} /> : null}

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <select
            className="rounded border bg-white px-2 py-2 text-sm"
            aria-label="看板"
            value={boardId}
            onChange={(e) => setBoardId(e.target.value)}
          >
            <option value="">選擇看板</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <input
            className="rounded border px-2 py-2 text-sm"
            placeholder="使用者 Email"
            aria-label="使用者 Email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />

          <select
            className="rounded border bg-white px-2 py-2 text-sm"
            aria-label="動作"
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
          >
            <option value="assign">assign</option>
            <option value="remove">remove</option>
          </select>
        </div>

        <button
          className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={mut.isPending || !boardId || !userEmail.trim()}
          onClick={async () => {
            await mut.mutateAsync({ boardId, userEmail: userEmail.trim(), action });
            setUserEmail("");
          }}
        >
          送出
        </button>
      </div>

      {mut.isSuccess ? <div className="text-sm text-emerald-700">已完成</div> : null}
    </div>
  );
}
