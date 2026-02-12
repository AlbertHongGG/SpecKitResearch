import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { adminApi } from '../../api/admin';
import { documentsApi } from '../../api/documents';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useToast } from '../toast/ToastContext';

export function SubmitForApprovalPanel(props: {
  documentId: string;
  disabled?: boolean;
  onSubmitted?: () => void;
}) {
  const { documentId, disabled, onSubmitted } = props;
  const toast = useToast();

  const templatesQuery = useQuery({
    queryKey: ['flows', 'active'],
    queryFn: () => adminApi.listActiveTemplates(),
  });

  const templates = templatesQuery.data?.templates ?? [];
  const [templateId, setTemplateId] = useState<string>('');

  const firstTemplateId = useMemo(() => templates[0]?.id ?? '', [templates]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const chosen = templateId || firstTemplateId;
      if (!chosen) throw new Error('No active template');
      await documentsApi.submit(documentId, { templateId: chosen });
    },
    onSuccess: async () => {
      toast.success('已送審');
      onSubmitted?.();
    },
    onError: (e) => {
      toast.error('送審失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">送審</div>

      {templatesQuery.isLoading ? <div className="text-sm text-slate-600">載入流程模板中…</div> : null}
      {templatesQuery.error ? (
        <div className="text-sm text-rose-700">載入模板失敗：{String(templatesQuery.error)}</div>
      ) : null}

      {templates.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-80">
            <Select
              data-testid="template-select"
              value={templateId || firstTemplateId}
              disabled={disabled || submitMutation.isPending}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <Button
            data-testid="submit-for-approval"
            type="button"
            variant="primary"
            loading={submitMutation.isPending}
            disabled={disabled || templates.length === 0}
            onClick={() => submitMutation.mutate()}
          >
            送出簽核
          </Button>
        </div>
      ) : templatesQuery.isLoading ? null : (
        <div className="text-sm text-slate-600">目前沒有可用的流程模板（請聯繫管理員）。</div>
      )}

      {submitMutation.error ? (
        <div className="text-sm text-rose-700">送審失敗：{String(submitMutation.error)}</div>
      ) : null}
    </div>
  );
}
