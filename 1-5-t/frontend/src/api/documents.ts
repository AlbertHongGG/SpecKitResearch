import type {
  CreateDraftRequest,
  CreateDraftResponse,
  DocumentDetailResponse,
  ListDocumentsResponse,
  SubmitForApprovalRequest,
  UpdateDraftRequest,
} from '@internal/contracts';
import { apiFetch } from './http';

export const documentsApi = {
  list() {
    return apiFetch<ListDocumentsResponse>('/api/documents');
  },
  createDraft(body: CreateDraftRequest) {
    return apiFetch<CreateDraftResponse>('/api/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  detail(documentId: string) {
    return apiFetch<DocumentDetailResponse>(`/api/documents/${documentId}`);
  },
  updateDraft(documentId: string, body: UpdateDraftRequest) {
    return apiFetch<{ ok: true }>(`/api/documents/${documentId}/draft`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  async uploadAttachment(documentId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ attachment: any }>(`/api/documents/${documentId}/attachments`, {
      method: 'POST',
      body: form,
    });
  },
  submit(documentId: string, body: SubmitForApprovalRequest) {
    return apiFetch<{ ok: true }>(`/api/documents/${documentId}/submit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  reopenAsDraft(documentId: string) {
    return apiFetch<{ ok: true }>(`/api/documents/${documentId}/reopen`, { method: 'POST' });
  },
  archive(documentId: string) {
    return apiFetch<{ ok: true }>(`/api/documents/${documentId}/archive`, { method: 'POST' });
  },
};
