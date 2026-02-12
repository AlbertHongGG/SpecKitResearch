import { apiUpload } from '../../../api/http';

export interface Attachment {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

export async function uploadAttachment(file: File): Promise<Attachment> {
  const fd = new FormData();
  fd.append('file', file);
  return apiUpload<Attachment>('/attachments', fd);
}
