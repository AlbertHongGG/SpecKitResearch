import { useMutation } from '@tanstack/react-query';
import { uploadAttachment } from '../api/attachmentsApi';
import { getApiErrorMessage } from '../../../api/errorHandling';

export function AttachmentUploader({
  value,
  onChange,
}: {
  value: { attachmentId: string; label: string } | null;
  onChange: (next: { attachmentId: string; label: string } | null) => void;
}) {
  const upload = useMutation({
    mutationFn: async (file: File) => uploadAttachment(file),
    onSuccess: (att) => {
      onChange({ attachmentId: att.id, label: att.original_filename });
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate(f);
          }}
        />
        {value ? <span className="text-sm text-slate-700">已上傳：{value.label}</span> : null}
      </div>

      {upload.isPending ? <div className="text-sm text-slate-600">上傳中…</div> : null}
      {upload.isError ? (
        <div className="text-sm text-red-600">{getApiErrorMessage(upload.error)}</div>
      ) : null}
      {value ? (
        <button
          type="button"
          className="text-sm text-slate-600 underline"
          onClick={() => onChange(null)}
        >
          清除附件
        </button>
      ) : null}
    </div>
  );
}
