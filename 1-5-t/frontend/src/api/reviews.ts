import type {
  ActTaskResponse,
  ListMyPendingTasksResponse,
  RejectTaskRequest,
} from '@internal/contracts';
import { apiFetch } from './http';

export const reviewsApi = {
  listMyPending() {
    return apiFetch<ListMyPendingTasksResponse>('/api/reviews/tasks');
  },
  approve(reviewTaskId: string) {
    return apiFetch<ActTaskResponse>(`/api/reviews/tasks/${reviewTaskId}/approve`, { method: 'POST' });
  },
  reject(reviewTaskId: string, body: RejectTaskRequest) {
    return apiFetch<ActTaskResponse>(`/api/reviews/tasks/${reviewTaskId}/reject`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
};
