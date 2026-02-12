import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from './apiClient';

export type ReviewerListItem = { id: string; email: string };

export type AdminFlowStep = {
  id: string;
  stepKey: string;
  orderIndex: number;
  mode: 'Serial' | 'Parallel';
  assignees: Array<{ reviewerId: string; reviewerEmail: string }>;
};

export type AdminFlowTemplate = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: AdminFlowStep[];
};

export function useAdminFlowsList() {
  return useQuery({
    queryKey: ['admin', 'flows'],
    queryFn: async () => {
      const resp = await apiFetch<{ flows: AdminFlowTemplate[] }>('/admin/flows');
      return resp.flows;
    },
  });
}

export function useAdminReviewers() {
  return useQuery({
    queryKey: ['admin', 'reviewers'],
    queryFn: async () => {
      const resp = await apiFetch<{ reviewers: ReviewerListItem[] }>('/admin/reviewers');
      return resp.reviewers;
    },
  });
}

export type UpsertAdminFlowInput = {
  id?: string;
  name: string;
  isActive?: boolean;
  steps: Array<{
    stepKey: string;
    orderIndex: number;
    mode: 'Serial' | 'Parallel';
    reviewerIds: string[];
  }>;
};

export function useUpsertAdminFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertAdminFlowInput) => {
      return apiFetch<{ templateId: string; isActive: boolean }>('/admin/flows', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'flows'] });
    },
  });
}

export function useDeactivateAdminFlow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      return apiFetch<{ templateId: string; isActive: boolean }>(`/admin/flows/${templateId}/deactivate`, {
        method: 'POST',
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'flows'] });
    },
  });
}
