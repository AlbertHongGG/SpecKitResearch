"use client";

import { useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import { Pagination } from "@/components/Pagination";
import { useAdminAuditLogs } from "@/lib/queries/admin";

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export function AuditLogTable() {
  const [page, setPage] = useState(1);
  const [actorId, setActorId] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");

  const q = useAdminAuditLogs({
    actorId: actorId.trim() || undefined,
    targetType: targetType.trim() || undefined,
    targetId: targetId.trim() || undefined,
    page,
    pageSize: 20,
  });

  const items = useMemo(() => q.data?.items ?? [], [q.data?.items]);
  const pageInfo = q.data?.pageInfo;

  if (q.isLoading) return <Loading label="載入 AuditLog…" />;
  if (q.isError) return <ErrorBanner error={q.error} />;

  return (
    <div className="space-y-3">
      <div className="text-lg font-semibold">Audit Log</div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            className="rounded border px-2 py-2 text-sm"
            placeholder="actorId"
            aria-label="actorId"
            value={actorId}
            onChange={(e) => {
              setPage(1);
              setActorId(e.target.value);
            }}
          />
          <input
            className="rounded border px-2 py-2 text-sm"
            placeholder="targetType"
            aria-label="targetType"
            value={targetType}
            onChange={(e) => {
              setPage(1);
              setTargetType(e.target.value);
            }}
          />
          <input
            className="rounded border px-2 py-2 text-sm"
            placeholder="targetId"
            aria-label="targetId"
            value={targetId}
            onChange={(e) => {
              setPage(1);
              setTargetId(e.target.value);
            }}
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">目前沒有紀錄</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">時間</th>
                <th className="px-3 py-2">action</th>
                <th className="px-3 py-2">actorId</th>
                <th className="px-3 py-2">target</th>
                <th className="px-3 py-2">metadata</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(it.createdAt)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{it.action}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{it.actorId ?? "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                    {it.targetType}:{it.targetId}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-pre-wrap break-all">{it.metadata}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageInfo ? <Pagination page={pageInfo.page} pageSize={pageInfo.pageSize} total={pageInfo.total} onChange={setPage} /> : null}
    </div>
  );
}
