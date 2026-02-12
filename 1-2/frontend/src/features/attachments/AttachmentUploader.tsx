import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/apiClient';
import { Button } from '../../components/ui/Button';

export function AttachmentUploader(props: { onUploaded: (attachmentId: string, filename: string) => void }) {
    const [fileName, setFileName] = useState<string | null>(null);

    const upload = useMutation({
        mutationFn: async (file: File) => {
            const fd = new FormData();
            fd.append('file', file);
            const res = await apiFetch<{ attachmentId: string }>('/attachments', { method: 'POST', formData: fd });
            return res;
        },
        onSuccess: (res) => {
            if (fileName) props.onUploaded(res.attachmentId, fileName);
        },
    });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFileName(f.name);
                    upload.mutate(f);
                }}
            />
            {upload.isPending ? <span>上傳中…</span> : null}
            {upload.isError ? <span style={{ color: 'crimson' }}>上傳失敗</span> : null}
            {upload.isSuccess ? <Button type="button" onClick={() => upload.reset()}>重新上傳</Button> : null}
        </div>
    );
}
