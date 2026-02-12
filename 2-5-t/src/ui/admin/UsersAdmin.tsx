"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/src/ui/api/client";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { Modal } from "@/src/ui/components/Modal";
import { useToast } from "@/src/ui/components/Toast";

type AdminUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  isBanned: boolean;
  createdAt: string;
};

type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
};

export function UsersAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { q, page }],
    queryFn: async () =>
      apiFetch<{ users: AdminUser[]; pageInfo: PageInfo }>(
        `/api/admin/users?q=${encodeURIComponent(q)}&page=${page}&pageSize=50`,
        { method: "GET" },
      ),
  });

  const users = usersQuery.data?.users ?? [];
  const pageInfo = usersQuery.data?.pageInfo;

  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");

  const banMutation = useMutation({
    mutationFn: async (input: { userId: string; reason?: string }) => {
      return apiFetch<{ ok: true }>(`/api/admin/users/${input.userId}/ban`, {
        method: "POST",
        json: { reason: input.reason || undefined },
      });
    },
    onSuccess: async () => {
      toast.push("已停權");
      setBanTarget(null);
      setBanReason("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
         toast.pushError(err);
    },
  });

  const unbanMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiFetch<{ ok: true }>(`/api/admin/users/${userId}/unban`, {
        method: "POST",
      });
    },
    onSuccess: async () => {
      toast.push("已解除停權");
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
         toast.pushError(err);
    },
  });

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
          <div className="min-w-[260px]">
            <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="email 或 id" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQ("");
                setPage(1);
              }}
            >
              清除
            </Button>
            <Button type="button" onClick={() => setPage(1)} disabled={usersQuery.isFetching}>
              {usersQuery.isFetching ? "查詢中…" : "查詢"}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-neutral-600">
          <div>{summary}</div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
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
        <h2 className="text-sm font-semibold">Users</h2>

        {usersQuery.isLoading ? <div className="text-sm text-neutral-600">載入中…</div> : null}

        {users.map((u) => (
          <div key={u.id} className="rounded-md border bg-white px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium">{u.email}</div>
                <div className="mt-1 text-xs text-neutral-600">{u.id}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  role: {u.role} · created: {new Date(u.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.isBanned ? (
                  <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">banned</span>
                ) : (
                  <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">active</span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              {u.isBanned ? (
                <Button type="button" variant="secondary" onClick={() => unbanMutation.mutate(u.id)} disabled={unbanMutation.isPending}>
                  解除停權
                </Button>
              ) : (
                <Button type="button" variant="danger" onClick={() => setBanTarget(u)}>
                  停權
                </Button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && !usersQuery.isLoading ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">沒有符合條件的使用者。</div>
        ) : null}
      </section>

      {banTarget ? (
        <Modal title={`停權：${banTarget.email}`} onClose={() => setBanTarget(null)}>
          <div className="space-y-3">
            <Input label="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setBanTarget(null)}>
                取消
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => banMutation.mutate({ userId: banTarget.id, reason: banReason })}
                disabled={banMutation.isPending}
              >
                {banMutation.isPending ? "處理中…" : "確認停權"}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
