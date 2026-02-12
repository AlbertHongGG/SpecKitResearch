import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/http/client";
import { getCsrfToken } from "@/lib/http/csrfClient";

export type AdminBoard = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
};

export function useAdminBoards() {
  return useQuery({
    queryKey: ["admin", "boards"],
    queryFn: () => fetchJson<{ boards: AdminBoard[] }>("/api/admin/boards"),
  });
}

export function useAdminCreateBoardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description: string; sortOrder?: number }) => {
      const token = await getCsrfToken();
      return fetchJson<{ board: AdminBoard }>("/api/admin/boards", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
  });
}

export function useAdminUpdateBoardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { boardId: string; name?: string; description?: string; isActive?: boolean; sortOrder?: number }) => {
      const token = await getCsrfToken();
      return fetchJson<{ board: AdminBoard }>("/api/admin/boards", {
        method: "PATCH",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
  });
}

export function useAdminReorderBoardsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { reorder: Array<{ boardId: string; sortOrder: number }> }) => {
      const token = await getCsrfToken();
      return fetchJson<{ boards: AdminBoard[] }>("/api/admin/boards", {
        method: "PATCH",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
  });
}

export function useAdminSetModeratorMutation() {
  return useMutation({
    mutationFn: async (input: { boardId: string; action: "assign" | "remove"; userId?: string; userEmail?: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ ok: boolean }>("/api/admin/moderators", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
  });
}

export function useAdminSetUserBanMutation() {
  return useMutation({
    mutationFn: async (input: { userId?: string; userEmail?: string; isBanned?: boolean; banned?: boolean; reason?: string }) => {
      const token = await getCsrfToken();
      return fetchJson<{ ok: boolean; user: { id: string; isBanned: boolean } }>("/api/admin/users/ban", {
        method: "POST",
        headers: { "x-csrf-token": token },
        body: JSON.stringify(input),
      });
    },
  });
}

export type PageInfo = { page: number; pageSize: number; total: number };

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

export function useAdminAuditLogs(params: {
  actorId?: string;
  targetType?: string;
  targetId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  const sp = new URLSearchParams();
  if (params.actorId) sp.set("actorId", params.actorId);
  if (params.targetType) sp.set("targetType", params.targetType);
  if (params.targetId) sp.set("targetId", params.targetId);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => fetchJson<{ items: AuditLogItem[]; pageInfo: PageInfo }>(`/api/admin/audit-logs?${sp.toString()}`),
  });
}

export type ReportItem = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  resolvedById: string | null;
  resolvedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export function useAdminReports(params: { status?: "pending" | "accepted" | "rejected"; page: number; pageSize: number }) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  return useQuery({
    queryKey: ["admin", "reports", params],
    queryFn: () => fetchJson<{ items: ReportItem[]; pageInfo: PageInfo }>(`/api/admin/reports?${sp.toString()}`),
  });
}
