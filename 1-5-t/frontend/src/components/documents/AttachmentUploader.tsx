import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { documentsApi } from '../../api/documents';
import { Button } from '../ui/Button';
import { useToast } from '../toast/ToastContext';

export function AttachmentUploader(props: {
  documentId: string;
  disabled?: boolean;
  onUploaded?: () => void;
}) {
  const { documentId, disabled, onUploaded } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const toast = useToast();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Missing file');
      await documentsApi.uploadAttachment(documentId, selected);
    },
    onSuccess: async () => {
      setSelected(null);
      if (inputRef.current) inputRef.current.value = '';
      toast.success('附件已上傳');
      onUploaded?.();
    },
    onError: (e) => {
      toast.error('上傳失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">上傳附件（Draft only）</div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          data-testid="attachment-file"
          ref={inputRef}
          type="file"
          disabled={disabled || uploadMutation.isPending}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setSelected(file);
          }}
        />
        <Button
          data-testid="upload-attachment"
          type="button"
          variant="secondary"
          disabled={disabled || !selected}
          loading={uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          上傳
        </Button>
      </div>
      {uploadMutation.error ? (
        <div className="text-xs text-rose-700">上傳失敗：{String(uploadMutation.error)}</div>
      ) : null}
    </div>
  );
}
