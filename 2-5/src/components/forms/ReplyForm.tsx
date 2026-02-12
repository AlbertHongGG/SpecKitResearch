"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorBanner } from "@/components/ErrorBanner";
import { useCreatePostMutation } from "@/lib/mutations/posts";
import type { ApiClientError } from "@/lib/http/client";

const schema = z.object({
  content: z.string().min(1).max(50_000),
});

type FormValues = z.infer<typeof schema>;

export function ReplyForm(props: { threadId: string; disabled?: boolean }) {
  const create = useCreatePostMutation(props.threadId);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { content: "" },
  });

  return (
    <form
      className="space-y-2 rounded-lg border bg-white p-4"
      onSubmit={handleSubmit(async (values) => {
        await create.mutateAsync(values);
        reset();
      })}
    >
      {create.isError ? <ErrorBanner error={create.error as ApiClientError} /> : null}

      <div className="text-sm font-medium">回覆</div>
      <textarea
        className="h-28 w-full rounded border px-3 py-2 text-sm"
        placeholder="輸入回覆內容"
        disabled={props.disabled || create.isPending}
        {...register("content")}
      />
      <button
        className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        type="submit"
        disabled={props.disabled || create.isPending}
      >
        {create.isPending ? "送出中…" : "送出"}
      </button>
    </form>
  );
}
