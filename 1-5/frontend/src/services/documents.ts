import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from './apiClient';

export type DocumentStatus = 'Draft' | 'Submitted' | 'In Review' | 'Rejected' | 'Approved' | 'Archived';

export type DocumentListItem = {
  id: string;
  title: string;
  status: DocumentStatus;
  updatedAt: string;
};

export type DocumentDetail = {
  document: {
    id: string;
    title: string;
    status: DocumentStatus;
    owner: { id: string; email: string };
    flowTemplateId: string | null;
    createdAt: string;
    updatedAt: string;
    currentVersionId: string | null;
  };
  versions: Array<{
    id: string;
    versionNo: number;
    kind: 'Draft' | 'SubmittedSnapshot';
    createdAt: string;
    content: string;
    attachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      storageKey: string;
      createdAt: string;
    }>;
  }>;
  reviewTasks: Array<{
    id: string;
    documentId: string;
    documentVersionId: string;
    assignee: { id: string; email: string; role: string };
    stepKey: string;
    mode: 'Serial' | 'Parallel';
    status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
    actedAt: string | null;
    createdAt: string;
  }>;
  approvalRecords: Array<{
    id: string;
    documentId: string;
    documentVersionId: string;
    reviewTaskId: string;
    actor: { id: string; email: string; role: string };
    action: 'Approved' | 'Rejected';
    reason: string | null;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    requestId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
};

export function useDocumentsList() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const resp = await apiFetch<{ documents: DocumentListItem[] }>('/documents');
      return resp.documents;
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title?: string; content?: string }) => {
      return apiFetch<{ id: string }>('/documents', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDocumentDetail(id: string) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => apiFetch<DocumentDetail>(`/documents/${id}`),
    enabled: Boolean(id),
  });
}

export function useUpdateDraft(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      return apiFetch<{ id: string; status: DocumentStatus }>(`/documents/${id}/draft`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['document', id] }),
        qc.invalidateQueries({ queryKey: ['documents'] }),
      ]);
    },
  });
}

export function useUploadDraftAttachment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiFetch<{ id: string }>(`/documents/${id}/attachments`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['document', id] });
    },
  });
}

export type FlowListItem = { id: string; name: string };

export function useActiveFlows() {
  return useQuery({
    queryKey: ['flows', 'active'],
    queryFn: async () => {
      const resp = await apiFetch<{ flows: FlowListItem[] }>('/flows/active');
      return resp.flows;
    },
  });
}

export function useSubmitDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (flowTemplateId: string) => {
      return apiFetch<{ documentId: string; status: DocumentStatus }>(`/documents/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ flowTemplateId }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['document', id] }),
        qc.invalidateQueries({ queryKey: ['documents'] }),
      ]);
    },
  });
}

export function useArchiveDocument(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return apiFetch<{ documentId: string; status: DocumentStatus }>(`/documents/${id}/archive`, {
        method: 'POST',
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['document', id] }),
        qc.invalidateQueries({ queryKey: ['documents'] }),
      ]);
    },
  });
}

