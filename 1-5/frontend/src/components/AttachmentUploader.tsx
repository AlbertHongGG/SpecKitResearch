import type { DocumentDetail } from '../services/documents';
import { useUploadDraftAttachment } from '../services/documents';
import { useToast } from '../ui/toast';

export function AttachmentUploader(props: { document: DocumentDetail }) {
  const id = props.document.document.id;
  const upload = useUploadDraftAttachment(id);
  const toast = useToast();

  const currentVersion = props.document.versions.find((v) => v.id === props.document.document.currentVersionId);
  const attachments = currentVersion?.attachments ?? [];

  return (
    <div className="space-y-3">
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            void upload
              .mutateAsync(file)
              .then(() => toast.success('附件已上傳'))
              .catch(() => toast.error('附件上傳失敗'));
          e.currentTarget.value = '';
        }}
      />

      {upload.isPending ? <div className="text-xs text-slate-600">上傳中…</div> : null}
      {upload.isError ? <div className="text-xs text-rose-700">上傳失敗，請重試。</div> : null}

      {attachments.length === 0 ? (
        <div className="text-sm text-slate-600">尚未上傳附件。</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
              <div>
                <div className="text-slate-900">{a.filename}</div>
                <div className="text-xs text-slate-500">
                  {a.contentType} · {(a.sizeBytes / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
