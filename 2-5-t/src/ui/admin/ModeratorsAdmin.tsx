"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch, ApiError } from "@/src/ui/api/client";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { useToast } from "@/src/ui/components/Toast";

type Board = {
  id: string;
  name: string;
  isActive: boolean;
};

type Assignment = {
  id: string;
  boardId: string;
  user: { id: string; email: string; role: string; isBanned: boolean };
};

export function ModeratorsAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ["admin", "boards"],
    queryFn: async () => apiFetch<{ boards: Board[] }>("/api/admin/boards", { method: "GET" }),
  });

  const boards = boardsQuery.data?.boards ?? [];
  const [boardId, setBoardId] = useState<string>(boards[0]?.id ?? "");

  const effectiveBoardId = boardId || boards[0]?.id || "";

  const assignmentsQuery = useQuery({
    queryKey: ["admin", "moderators", effectiveBoardId],
    queryFn: async () =>
      apiFetch<{ assignments: Assignment[] }>(`/api/admin/moderators?boardId=${encodeURIComponent(effectiveBoardId)}`, {
        method: "GET",
      }),
    enabled: !!effectiveBoardId,
  });

  const [email, setEmail] = useState("");

  const assignMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ assignment: { id: string } }>("/api/admin/moderators", {
        method: "POST",
        json: { boardId: effectiveBoardId, userEmail: email },
      });
    },
    onSuccess: async () => {
      toast.push("已指派 moderator");
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "moderators", effectiveBoardId] });
    },
    onError: (err) => {
      toast.pushError(err);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      return apiFetch<{ ok: true }>("/api/admin/moderators", {
        method: "DELETE",
        json: { boardId: effectiveBoardId, userEmail },
      });
    },
    onSuccess: async () => {
      toast.push("已解除指派");
      await queryClient.invalidateQueries({ queryKey: ["admin", "moderators", effectiveBoardId] });
    },
    onError: (err) => {
      toast.pushError(err);
    },
  });

  const rows = useMemo(() => assignmentsQuery.data?.assignments ?? [], [assignmentsQuery.data]);

  return (
    <div className="space-y-4">
      <section className="rounded-md border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Board</div>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            value={effectiveBoardId}
            onChange={(e) => setBoardId(e.target.value)}
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[260px]">
            <Input label="User email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="button" onClick={() => assignMutation.mutate()} disabled={!effectiveBoardId || assignMutation.isPending}>
            指派
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Assignments</h2>

        {assignmentsQuery.isLoading ? <div className="text-sm text-neutral-600">載入中…</div> : null}

        {rows.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-white px-4 py-3">
            <div className="text-sm">
              {a.user.email}
              <span className="ml-2 text-xs text-neutral-600">({a.user.id})</span>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => unassignMutation.mutate(a.user.email)}
              disabled={unassignMutation.isPending}
            >
              解除
            </Button>
          </div>
        ))}

        {rows.length === 0 && !assignmentsQuery.isLoading ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">目前沒有指派。</div>
        ) : null}
      </section>
    </div>
  );
}
