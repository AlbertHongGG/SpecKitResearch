"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/src/ui/api/client";
import { Input } from "@/src/ui/components/Input";
import { Button } from "@/src/ui/components/Button";

type AuditLogItem = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: any;
  createdAt: string;
};

type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
};

export function AuditAdmin() {
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [page, setPage] = useState(1);

  const auditQuery = useQuery({
    queryKey: ["admin", "audit", { targetType, targetId, page }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (targetType) qs.set("targetType", targetType);
      if (targetId) qs.set("targetId", targetId);
      qs.set("page", String(page));
      qs.set("pageSize", "50");

      return apiFetch<{ items: AuditLogItem[]; pageInfo: PageInfo }>(`/api/admin/audit?${qs.toString()}`, { method: "GET" });
    },
  });

  const rows = auditQuery.data?.items ?? [];
  const pageInfo = auditQuery.data?.pageInfo;

  const summary = useMemo(() => {
    if (!pageInfo) return null;
    const from = (pageInfo.page - 1) * pageInfo.pageSize + 1;
    const to = Math.min(pageInfo.total, pageInfo.page * pageInfo.pageSize);
    return `${from}–${to} / ${pageInfo.total}`;
  }, [pageInfo]);

  return (
    <div className="space-y-4">
      <section className="rounded-md border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="targetType" value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="user / board / thread / post / report" />
          <Input label="targetId" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
          <Input label="page" type="number" value={String(page)} onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))} />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-neutral-600">{summary}</div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))}>
              上一頁
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={!!pageInfo && pageInfo.page * pageInfo.pageSize >= pageInfo.total}
            >
              下一頁
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Audit logs</h2>

        {auditQuery.isLoading ? <div className="text-sm text-neutral-600">載入中…</div> : null}

        {rows.map((it) => (
          <div key={it.id} className="rounded-md border bg-white px-4 py-3">
            <div className="text-sm font-medium">{it.action}</div>
            <div className="mt-1 text-xs text-neutral-600">
              {new Date(it.createdAt).toLocaleString()} · actor: {it.actorId ?? "(system)"}
            </div>
            <div className="mt-1 text-xs text-neutral-600">
              target: {it.targetType}:{" "}
              <span className="font-mono">{it.targetId}</span>
            </div>
            {it.metadata ? (
              <pre className="mt-2 overflow-auto rounded bg-neutral-50 p-2 text-xs text-neutral-800">
                {JSON.stringify(it.metadata, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}

        {rows.length === 0 && !auditQuery.isLoading ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">目前沒有資料。</div>
        ) : null}
      </section>
    </div>
  );
}
