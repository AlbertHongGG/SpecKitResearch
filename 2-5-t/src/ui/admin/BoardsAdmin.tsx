"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiFetch, ApiError } from "@/src/ui/api/client";
import { Button } from "@/src/ui/components/Button";
import { Input } from "@/src/ui/components/Input";
import { useToast } from "@/src/ui/components/Toast";

type Board = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

const createSchema = z.object({
  name: z.string().trim().min(1, "請輸入名稱"),
  description: z.string().trim().max(2000).optional(),
});

export function BoardsAdmin() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ["admin", "boards"],
    queryFn: async () => apiFetch<{ boards: Board[] }>("/api/admin/boards", { method: "GET" }),
  });

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = createSchema.safeParse({ name: createName, description: createDescription });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Validation error");

      return apiFetch<{ board: Board }>("/api/admin/boards", {
        method: "POST",
        json: { name: parsed.data.name, description: parsed.data.description || null },
      });
    },
    onSuccess: async () => {
      setCreateName("");
      setCreateDescription("");
      setCreateError(null);
      toast.push("已建立看板");
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "建立失敗";
      setCreateError(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; patch: Partial<Pick<Board, "name" | "description" | "isActive" | "sortOrder">> }) => {
      return apiFetch<{ board: Board }>(`/api/admin/boards/${input.id}`, {
        method: "PATCH",
        json: input.patch,
      });
    },
    onSuccess: async () => {
      toast.push("已儲存");
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
    onError: (err) => {
      toast.pushError(err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<{ ok: true }>(`/api/admin/boards/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      toast.push("已刪除");
      await queryClient.invalidateQueries({ queryKey: ["admin", "boards"] });
    },
    onError: (err) => {
      toast.pushError(err);
    },
  });

  const boards = boardsQuery.data?.boards ?? [];

  const [drafts, setDrafts] = useState<Record<string, Board>>({});

  const rows = useMemo(() => {
    return boards.map((b) => drafts[b.id] ?? b);
  }, [boards, drafts]);

  const setDraft = (id: string, patch: Partial<Board>) => {
    const base = boards.find((b) => b.id === id);
    if (!base) return;
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? base), ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-md border bg-white p-4">
        <h2 className="text-sm font-semibold">新增看板</h2>
        <div className="mt-3 grid gap-3">
          <Input label="名稱" value={createName} onChange={(e) => setCreateName(e.target.value)} />
          <Input
            label="描述"
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
          />
          {createError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "建立中…" : "建立"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">看板列表</h2>

        {boardsQuery.isLoading ? <div className="text-sm text-neutral-600">載入中…</div> : null}

        {rows.map((b) => (
          <div key={b.id} className="rounded-md border bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="名稱" value={b.name} onChange={(e) => setDraft(b.id, { name: e.target.value })} />
              <Input
                label="Sort order"
                type="number"
                value={String(b.sortOrder)}
                onChange={(e) => setDraft(b.id, { sortOrder: Number(e.target.value) })}
              />
              <Input
                label="描述"
                value={b.description ?? ""}
                onChange={(e) => setDraft(b.id, { description: e.target.value })}
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={b.isActive}
                  onChange={(e) => setDraft(b.id, { isActive: e.target.checked })}
                />
                Active
              </label>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDrafts((prev) => {
                    const { [b.id]: _omit, ...rest } = prev;
                    return rest;
                  });
                }}
              >
                重設
              </Button>
              <Button
                type="button"
                onClick={() =>
                  updateMutation.mutate({
                    id: b.id,
                    patch: {
                      name: b.name,
                      description: b.description ?? null,
                      isActive: b.isActive,
                      sortOrder: b.sortOrder,
                    },
                  })
                }
                disabled={updateMutation.isPending}
              >
                儲存
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => deleteMutation.mutate(b.id)}
                disabled={deleteMutation.isPending}
              >
                刪除
              </Button>
            </div>
          </div>
        ))}

        {rows.length === 0 && !boardsQuery.isLoading ? (
          <div className="rounded-md border bg-white px-4 py-8 text-sm text-neutral-600">尚無看板。</div>
        ) : null}
      </section>
    </div>
  );
}
