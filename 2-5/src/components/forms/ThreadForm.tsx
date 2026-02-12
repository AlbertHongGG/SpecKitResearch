"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useBoards } from "@/lib/queries/boards";
import { useCreateThreadMutation } from "@/lib/mutations/threads";
import type { ApiClientError } from "@/lib/http/client";

const schema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
});

type FormValues = z.infer<typeof schema>;

export function ThreadForm(props: { onCreated?: (threadId: string) => void }) {
  const boardsQ = useBoards();
  const create = useCreateThreadMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", content: "" },
  });

  if (boardsQ.isLoading) return <div className="rounded-lg border bg-white p-4 text-sm">載入看板…</div>;
  if (boardsQ.isError) return <ErrorBanner error={boardsQ.error} />;

  const boards = boardsQ.data?.boards ?? [];

  return (
    <form
      className="space-y-3 rounded-lg border bg-white p-4"
      onSubmit={(e) => e.preventDefault()}
    >
      {create.isError ? <ErrorBanner error={create.error as ApiClientError} /> : null}

      <label className="block space-y-1">
        <div className="text-sm text-slate-600">看板</div>
        <select className="w-full rounded border bg-white px-3 py-2 text-sm" {...register("boardId")}>
          <option value="">請選擇…</option>
          {boards
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.isActive ? "" : "（停用）"}
              </option>
            ))}
        </select>
        {errors.boardId ? <div className="text-xs text-red-600">{errors.boardId.message}</div> : null}
      </label>

      <label className="block space-y-1">
        <div className="text-sm text-slate-600">標題</div>
        <input className="w-full rounded border px-3 py-2 text-sm" {...register("title")} />
        {errors.title ? <div className="text-xs text-red-600">{errors.title.message}</div> : null}
      </label>

      <label className="block space-y-1">
        <div className="text-sm text-slate-600">內容</div>
        <textarea className="h-40 w-full rounded border px-3 py-2 text-sm" {...register("content")} />
        {errors.content ? <div className="text-xs text-red-600">{errors.content.message}</div> : null}
      </label>

      <div className="flex gap-2">
        <button
          className="rounded border px-4 py-2 text-sm disabled:opacity-60"
          type="button"
          disabled={create.isPending}
          onClick={handleSubmit(async (values) => {
            const res = await create.mutateAsync({ ...values, intent: "save_draft" });
            props.onCreated?.(res.thread.id);
          })}
        >
          {create.isPending ? "處理中…" : "儲存草稿"}
        </button>

        <button
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          type="button"
          disabled={create.isPending}
          onClick={handleSubmit(async (values) => {
            const res = await create.mutateAsync({ ...values, intent: "publish" });
            props.onCreated?.(res.thread.id);
          })}
        >
          {create.isPending ? "處理中…" : "發布"}
        </button>
      </div>
    </form>
  );
}
