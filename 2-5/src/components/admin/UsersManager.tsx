"use client";

import { useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useAdminSetUserBanMutation } from "@/lib/queries/admin";

export function UsersManager() {
  const mut = useAdminSetUserBanMutation();

  const [userEmail, setUserEmail] = useState("");
  const [banned, setBanned] = useState(true);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">使用者停權</div>
      {mut.isError ? <ErrorBanner error={mut.error} /> : null}

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="rounded border px-2 py-2 text-sm"
            placeholder="使用者 Email"
            aria-label="停權 Email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />

          <select
            className="rounded border bg-white px-2 py-2 text-sm"
            aria-label="停權狀態"
            value={banned ? "ban" : "unban"}
            onChange={(e) => setBanned(e.target.value === "ban")}
          >
            <option value="ban">ban</option>
            <option value="unban">unban</option>
          </select>

          <input
            className="rounded border px-2 py-2 text-sm"
            placeholder="原因（選填）"
            aria-label="停權原因"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <button
          className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={mut.isPending || !userEmail.trim()}
          onClick={async () => {
            await mut.mutateAsync({ userEmail: userEmail.trim(), banned, reason: reason.trim() || undefined });
          }}
        >
          送出
        </button>
      </div>

      {mut.isSuccess ? <div className="text-sm text-emerald-700">已完成</div> : null}
    </div>
  );
}
