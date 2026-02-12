"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Modal } from "@/src/ui/components/Modal";
import { Button } from "@/src/ui/components/Button";
import { makeZodResolver } from "@/src/ui/forms/formHelpers";
import { ThreadDraftForm, threadDraftSchema } from "@/src/ui/forms/zodSchemas";
import { ApiError, apiFetch } from "@/src/ui/api/client";

type Props = {
  boardId: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function ThreadEditor({ boardId, disabled = false, disabledReason }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<ThreadDraftForm>({
    resolver: makeZodResolver(threadDraftSchema),
    defaultValues: { title: "", content: "" },
  });

  const publishMutation = useMutation({
    mutationFn: async (values: ThreadDraftForm) => {
      const created = await apiFetch<{ thread: { id: string } }>("/api/threads", {
        method: "POST",
        json: { boardId, title: values.title, content: values.content || undefined },
      });

      await apiFetch<{ thread: { id: string } }>(`/api/threads/${created.thread.id}/publish`, {
        method: "POST",
      });

      return created.thread.id;
    },
    onSuccess: (threadId) => {
      setOpen(false);
      router.push(`/threads/${threadId}`);
      router.refresh();
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
      >
        新增主題
      </Button>

      {open ? (
        <Modal
          title="新增主題"
          onClose={() => {
            setOpen(false);
            form.reset();
          }}
        >
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              form.clearErrors("root");
              try {
                await publishMutation.mutateAsync(values);
              } catch (err) {
                const message = err instanceof ApiError ? err.message : "發文失敗";
                form.setError("root", { message });
              }
            })}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-900">標題</span>
              <input
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                {...form.register("title")}
              />
              {form.formState.errors.title?.message ? (
                <span className="mt-1 block text-sm text-red-600">
                  {form.formState.errors.title.message}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-900">內容</span>
              <textarea
                className="min-h-32 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                {...form.register("content")}
              />
              {form.formState.errors.content?.message ? (
                <span className="mt-1 block text-sm text-red-600">
                  {form.formState.errors.content.message}
                </span>
              ) : null}
            </label>

            {form.formState.errors.root?.message ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {form.formState.errors.root.message}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                取消
              </Button>
              <Button type="submit" disabled={publishMutation.isPending}>
                {publishMutation.isPending ? "發布中…" : "發布"}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
