import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { DocumentDetail } from '../services/documents';
import { useUpdateDraft } from '../services/documents';
import { AsyncButton } from '../ui/AsyncButton';
import { useToast } from '../ui/toast';

const Schema = z.object({
  title: z.string().min(1, '請輸入標題').max(120, '標題不可超過 120 字'),
  content: z.string(),
});

type FormValues = z.infer<typeof Schema>;

export function DocumentDraftEditor(props: { document: DocumentDetail }) {
  const id = props.document.document.id;
  const draftVersion = props.document.versions.find((v) => v.id === props.document.document.currentVersionId);

  const update = useUpdateDraft(id);
  const toast = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      title: props.document.document.title,
      content: draftVersion?.content ?? '',
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await update.mutateAsync(values);
          toast.success('Draft 已儲存');
        } catch {
          toast.error('Draft 儲存失敗');
        }
      })}
    >
      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="title">
          標題
        </label>
        <input
          id="title"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          {...form.register('title')}
        />
        {form.formState.errors.title ? (
          <div className="mt-1 text-xs text-rose-700">{form.formState.errors.title.message}</div>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700" htmlFor="content">
          內容
        </label>
        <textarea
          id="content"
          rows={10}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          {...form.register('content')}
        />
      </div>

      <AsyncButton
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        isLoading={update.isPending}
        loadingText="儲存中…"
        type="submit"
      >
        儲存 Draft
      </AsyncButton>
    </form>
  );
}
