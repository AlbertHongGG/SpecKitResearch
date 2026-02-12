"use client";

import { useEffect, useMemo, useState } from "react";
import { ErrorBanner } from "@/components/ErrorBanner";
import { Loading } from "@/components/Loading";
import {
  useAdminBoards,
  useAdminCreateBoardMutation,
  useAdminReorderBoardsMutation,
  useAdminUpdateBoardMutation,
  type AdminBoard,
} from "@/lib/queries/admin";

type Edit = { name: string; description: string; sortOrder: number; isActive: boolean };

export function BoardsManager() {
  const q = useAdminBoards();
  const create = useAdminCreateBoardMutation();
  const update = useAdminUpdateBoardMutation();
  const reorder = useAdminReorderBoardsMutation();

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);

  const [edits, setEdits] = useState<Record<string, Edit>>({});

  useEffect(() => {
    if (!q.data?.boards) return;
    setEdits((prev) => {
      if (Object.keys(prev).length > 0) return prev;
      const next: Record<string, Edit> = {};
      for (const b of q.data.boards) {
        next[b.id] = { name: b.name, description: b.description, sortOrder: b.sortOrder, isActive: b.isActive };
      }
      return next;
    });
  }, [q.data?.boards]);

  const boards = useMemo(() => q.data?.boards ?? [], [q.data?.boards]);

  if (q.isLoading) return <Loading label="載入看板…" />;
  if (q.isError) return <ErrorBanner error={q.error} />;

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">看板管理</div>

      {create.isError ? <ErrorBanner error={create.error} /> : null}
      {update.isError ? <ErrorBanner error={update.error} /> : null}
      {reorder.isError ? <ErrorBanner error={reorder.error} /> : null}

      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">新增看板</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            className="rounded border px-2 py-1 text-sm"
            placeholder="名稱"
            aria-label="看板名稱"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1 text-sm sm:col-span-2"
            placeholder="描述"
            aria-label="看板描述"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <input
            className="rounded border px-2 py-1 text-sm"
            type="number"
            aria-label="看板排序"
            value={newSortOrder}
            onChange={(e) => setNewSortOrder(Number(e.target.value))}
          />
        </div>
        <button
          className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={create.isPending || !newName.trim()}
          onClick={async () => {
            await create.mutateAsync({ name: newName.trim(), description: newDescription, sortOrder: newSortOrder });
            setNewName("");
            setNewDescription("");
            setNewSortOrder(0);
            setEdits({});
          }}
        >
          新增
        </button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">現有看板</div>
          <button
            className="rounded border bg-white px-3 py-2 text-sm disabled:opacity-50"
            disabled={reorder.isPending || boards.length === 0}
            onClick={async () => {
              const reorderPayload = boards
                .map((b) => ({ boardId: b.id, sortOrder: edits[b.id]?.sortOrder ?? b.sortOrder }))
                .sort((a, b) => a.sortOrder - b.sortOrder);
              await reorder.mutateAsync({ reorder: reorderPayload });
              setEdits({});
            }}
          >
            套用排序
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="mt-2 text-sm text-slate-600">目前沒有看板</div>
        ) : (
          <div className="mt-3 space-y-3">
            {boards.map((b: AdminBoard) => {
              const e = edits[b.id] ?? { name: b.name, description: b.description, sortOrder: b.sortOrder, isActive: b.isActive };
              return (
                <div key={b.id} className="rounded border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">{b.name}</div>
                    <div className="font-mono text-xs text-slate-500">{b.id}</div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-4">
                    <input
                      className="rounded border px-2 py-1 text-sm"
                      value={e.name}
                      onChange={(ev) => setEdits((p) => ({ ...p, [b.id]: { ...e, name: ev.target.value } }))}
                    />
                    <input
                      className="rounded border px-2 py-1 text-sm sm:col-span-2"
                      value={e.description}
                      onChange={(ev) => setEdits((p) => ({ ...p, [b.id]: { ...e, description: ev.target.value } }))}
                    />
                    <input
                      className="rounded border px-2 py-1 text-sm"
                      type="number"
                      value={e.sortOrder}
                      onChange={(ev) => setEdits((p) => ({ ...p, [b.id]: { ...e, sortOrder: Number(ev.target.value) } }))}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={e.isActive}
                        onChange={(ev) => setEdits((p) => ({ ...p, [b.id]: { ...e, isActive: ev.target.checked } }))}
                      />
                      <span className={e.isActive ? "text-emerald-700" : "text-rose-700"}>
                        {e.isActive ? "啟用" : "停用"}
                      </span>
                    </label>

                    <button
                      className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
                      disabled={update.isPending}
                      onClick={async () => {
                        await update.mutateAsync({
                          boardId: b.id,
                          name: e.name,
                          description: e.description,
                          sortOrder: e.sortOrder,
                          isActive: e.isActive,
                        });
                        setEdits((p) => {
                          const { [b.id]: _drop, ...rest } = p;
                          return rest;
                        });
                      }}
                    >
                      儲存
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
