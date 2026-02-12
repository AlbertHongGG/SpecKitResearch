import type {
  ListActiveFlowTemplatesResponse,
  ListFlowTemplatesResponse,
  ListUsersResponse,
  UpsertFlowTemplateRequest,
} from '@internal/contracts';
import { apiFetch } from './http';

export const adminApi = {
  listFlows() {
    return apiFetch<ListFlowTemplatesResponse>('/api/admin/flows');
  },
  createFlow(body: UpsertFlowTemplateRequest) {
    return apiFetch<{ templateId: string }>('/api/admin/flows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  updateFlow(templateId: string, body: UpsertFlowTemplateRequest) {
    return apiFetch<{ templateId: string }>(`/api/admin/flows/${templateId}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  deactivateFlow(templateId: string) {
    return apiFetch<{ ok: true }>(`/api/admin/flows/${templateId}/deactivate`, { method: 'POST' });
  },
  listUsers(role: 'Reviewer' | 'User' | 'Admin' = 'Reviewer') {
    return apiFetch<ListUsersResponse>(`/api/admin/users?role=${encodeURIComponent(role)}`);
  },
  listActiveTemplates() {
    return apiFetch<ListActiveFlowTemplatesResponse>('/api/flows/active');
  },
};
