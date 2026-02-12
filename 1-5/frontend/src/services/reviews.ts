import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, ApiError } from './apiClient';
import type { DocumentStatus } from './documents';

export type PendingReviewTask = {
  id: string;
  documentId: string;
  stepKey: string;
  mode: 'Serial' | 'Parallel';
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  createdAt: string;
  document: {
    title: string;
    status: DocumentStatus;
    updatedAt: string;
  };
};

export function useMyPendingReviewTasks() {
  return useQuery({
    queryKey: ['reviews', 'tasks', 'pending'],
    queryFn: async () => {
      const resp = await apiFetch<{ tasks: PendingReviewTask[] }>('/reviews/tasks');
      return resp.tasks;
    },
  });
}

export type ActOnReviewTaskInput = {
  taskId: string;
  action: 'Approve' | 'Reject';
  reason?: string;
};

export function useActOnReviewTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ActOnReviewTaskInput) => {
      return apiFetch<{ documentId: string; status: DocumentStatus }>(`/review-tasks/${input.taskId}/action`, {
        method: 'POST',
        body: JSON.stringify({ action: input.action, reason: input.reason }),
      });
    },
    onSuccess: async (resp) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['reviews', 'tasks', 'pending'] }),
        qc.invalidateQueries({ queryKey: ['document', resp.documentId] }),
      ]);
    },
    onError: async (err) => {
      if (err instanceof ApiError && err.status === 409) {
        await qc.invalidateQueries({ queryKey: ['reviews', 'tasks', 'pending'] });
      }
    },
  });
}
