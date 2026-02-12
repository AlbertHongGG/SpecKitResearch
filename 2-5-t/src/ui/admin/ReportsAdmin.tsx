"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/src/ui/api/client";
import { Input } from "@/src/ui/components/Input";
import { Button } from "@/src/ui/components/Button";

type Board = {
  id: string;
  name: string;
  isActive: boolean;
};

type AdminReport = {
  id: string;
  boardId: string;
  reporterId: string;
  targetType: "thread" | "post";
  targetId: string;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  resolvedById: string | null;
  resolvedAt: string | null;
  note: string | null;
};

type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
};

const statuses = ["", "pending", "accepted", "rejected"] as const;

export function ReportsAdmin() {
  const [status, setStatus] = useState<(typeof statuses)[number]>("");
  const [boardId, setBoardId] = useState<string>("");
  const [page, setPage] = useState(1);

  const boardsQuery = useQuery({
    queryKey: ["admin", "boards"],
    queryFn: async () => apiFetch<{ boards: Board[] }>("/api/admin/boards", { method: "GET" }),
  });

  const reportsQuery = useQuery({
    queryKey: ["admin", "reports", { status, boardId, page }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (boardId) qs.set("boardId", boardId);
      qs.set("page", String(page));
      qs.set("pageSize", "50");

      return apiFetch<{ reports: AdminReport[]; pageInfo: PageInfo }>(`/api/admin/reports?${qs.toString()}`, { method: "GET" });
    },
  });

  const rows = reportsQuery.data?.reports ?? [];
  const pageInfo = reportsQuery.data?.pageInfo;

  const summary = useMemo(() => {
    if (!pageInfo) return null;
    const from = (pageInfo.page - 1) * pageInfo.pageSize + 1;
    const to = Math.min(pageInfo.total, pageInfo.page * pageInfo.pageSize);
    return `${from}–${to} / ${pageInfo.total}`;
  }, [pageInfo]);

  return (
    <div className="space-y-4">
      <section className="rounded-md border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-900">Status</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="">(any)</option>
              <option value="pending">pending</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-900">Board</span>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={boardId}
              onChange={(e) => {
                setBoardId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">(any)</option>
              {(boardsQuery.data?.boards ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </label>

          <div className="min-w-[180px]">
            <Input
              label="Page"
              type="number"
              value={String(page)}
              onChange={(e) => setPage(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

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

        <div className="mt-3 text-sm text-neutral-600">{summary}</div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Reports</h2>

        {reportsQuery.isLoading ? <div className="text-sm text-neutral-600">載入中…</div> : null}

        {rows.map((r) => (
          <div key={r.id} className="rounded-md border bg-white px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">
                  {r.status} · {r.targetType}:{" "}
                  <span className="font-mono text-xs">{r.targetId}</span>
                </div>
                <div className="mt-1 text-xs text-neutral-600">reportId: {r.id}</div>
                <div className="mt-1 text-xs text-neutral-600">boardId: {r.boardId}</div>
                <div className="mt-1 text-xs text-neutral-600">reporterId: {r.reporterId}</div>
                <div className="mt-2 text-sm text-neutral-800">{r.reason}</div>
                <div className="mt-2 text-xs text-neutral-600">created: {new Date(r.createdAt).toLocaleString()}</div>
                {r.resolvedAt ? (
                  <div className="mt-1 text-xs text-neutral-600">
                    resolved: {new Date(r.resolvedAt).toLocaleString()} by {r.resolvedById}
                  </div>
                ) : null}
                {r.note ? <div className="mt-1 text-xs text-neutral-600">note: {r.note}</div> : null}
              </div>
            </div>
          </div>
        ))}

        {rows.length === 0 && !reportsQuery.isLoading ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">目前沒有資料。</div>
        ) : null}
      </section>
    </div>
  );
}
