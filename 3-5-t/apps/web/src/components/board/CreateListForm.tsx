'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const zCreate = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1).max(200),
});

type Values = z.infer<typeof zCreate>;

export default function CreateListForm({
  boardId,
  disabled,
  onSubmit,
}: {
  boardId: string;
  disabled: boolean;
  onSubmit: (values: Values) => void | Promise<void>;
}) {
  const form = useForm<Values>({ resolver: zodResolver(zCreate), defaultValues: { boardId, title: '' } });

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit({ ...values, boardId });
        form.reset({ boardId, title: '' });
      })}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-600">建立 List</span>
        <input
          className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="例如：Todo"
          disabled={disabled}
          {...form.register('title')}
          data-testid="create-list-title"
        />
        {form.formState.errors.title ? <span className="text-xs text-red-600">{form.formState.errors.title.message}</span> : null}
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        data-testid="create-list-submit"
      >
        新增
      </button>
    </form>
  );
}
