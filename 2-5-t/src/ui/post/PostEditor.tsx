"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/src/ui/components/Button";
import { makeZodResolver } from "@/src/ui/forms/formHelpers";
import { PostForm, postSchema } from "@/src/ui/forms/zodSchemas";
import { ApiError, apiFetch } from "@/src/ui/api/client";

type Props = {
  threadId: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function PostEditor({ threadId, disabled = false, disabledReason }: Props) {
  const router = useRouter();
  const form = useForm<PostForm>({
    resolver: makeZodResolver(postSchema),
    defaultValues: { content: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: PostForm) => {
      await apiFetch("/api/threads/" + threadId + "/posts", {
        method: "POST",
        json: { content: values.content },
      });
    },
    onSuccess: () => {
      form.reset();
      router.refresh();
    },
  });

  return (
    <form
      className="rounded-md border bg-white p-4"
      onSubmit={form.handleSubmit(async (values) => {
        form.clearErrors("root");
        try {
          await mutation.mutateAsync(values);
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "回覆失敗";
          form.setError("root", { message });
        }
      })}
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-900">回覆內容</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black disabled:bg-gray-100"
          {...form.register("content")}
          disabled={disabled || mutation.isPending}
          placeholder={disabled ? disabledReason : "輸入回覆…"}
        />
        {form.formState.errors.content?.message ? (
          <span className="mt-1 block text-sm text-red-600">{form.formState.errors.content.message}</span>
        ) : null}
      </label>

      {disabled ? (
        <div className="mt-2 text-sm text-neutral-600">{disabledReason}</div>
      ) : null}

      {form.formState.errors.root?.message ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {form.formState.errors.root.message}
        </div>
      ) : null}

      <div className="mt-3 flex justify-end">
        <Button type="submit" disabled={disabled || mutation.isPending}>
          {mutation.isPending ? "送出中…" : "送出回覆"}
        </Button>
      </div>
    </form>
  );
}
