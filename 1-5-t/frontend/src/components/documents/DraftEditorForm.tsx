import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { documentsApi } from '../../api/documents';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { TextArea } from '../ui/TextArea';
import { useToast } from '../toast/ToastContext';

const DraftEditorSchema = z.object({
  title: z.string().min(1).max(120),
  content: z.string(),
});

type DraftEditorValues = z.infer<typeof DraftEditorSchema>;

export function DraftEditorForm(props: {
  documentId: string;
  initialTitle: string;
  initialContent: string;
  disabled?: boolean;
  onSaved?: () => void;
}) {
  const { documentId, initialTitle, initialContent, disabled, onSaved } = props;
  const toast = useToast();

  const form = useForm<DraftEditorValues>({
    resolver: zodResolver(DraftEditorSchema),
    defaultValues: { title: initialTitle, content: initialContent },
  });

  const mutation = useMutation({
    mutationFn: async (values: DraftEditorValues) => {
      await documentsApi.updateDraft(documentId, values);
    },
    onSuccess: async () => {
      toast.success('已儲存 Draft');
      onSaved?.();
    },
    onError: (e) => {
      toast.error('儲存失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <div>
        <div className="text-sm font-medium">標題</div>
        <div className="mt-1">
          <Input
            data-testid="draft-title"
            disabled={disabled || mutation.isPending}
            {...form.register('title')}
          />
        </div>
        {form.formState.errors.title ? (
          <div className="mt-1 text-xs text-rose-700">{form.formState.errors.title.message}</div>
        ) : null}
      </div>

      <div>
        <div className="text-sm font-medium">內容</div>
        <div className="mt-1">
          <TextArea
            data-testid="draft-content"
            rows={10}
            disabled={disabled || mutation.isPending}
            {...form.register('content')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button
          data-testid="save-draft"
          type="submit"
          variant="primary"
          loading={mutation.isPending}
          disabled={disabled}
        >
          儲存 Draft
        </Button>
      </div>
    </form>
  );
}
