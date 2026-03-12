'use client';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

const zCreate = z.object({
  name: z.string().min(1).max(200),
});

type Values = z.infer<typeof zCreate>;

export default function CreateBoardForm({
  disabled,
  onSubmit,
  compact,
}: {
  disabled: boolean;
  onSubmit: (values: Values) => void | Promise<void>;
  compact?: boolean;
}) {
  const form = useForm<Values>({ resolver: zodResolver(zCreate), defaultValues: { name: '' } });

  return (
    <form
      className={compact ? 'flex flex-wrap items-end gap-2' : 'flex flex-wrap items-end gap-3'}
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
        form.reset({ name: '' });
      })}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-600">建立 Board</span>
        <input
          className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="例如：Sprint"
          disabled={disabled}
          {...form.register('name')}
          data-testid="create-board-name"
        />
        {form.formState.errors.name ? <span className="text-xs text-red-600">{form.formState.errors.name.message}</span> : null}
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        data-testid="create-board-submit"
      >
        新增
      </button>
    </form>
  );
}
