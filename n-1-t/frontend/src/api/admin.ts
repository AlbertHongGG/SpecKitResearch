import { apiRequest } from './http';
import type {
  ActivityDetail,
  AdminChangeStatusRequest,
  AdminRegistrationRow,
  AdminUpsertActivityRequest,
  IdempotencyKeyBody,
} from './types';

export function listAdminActivities() {
  return apiRequest<{ items: ActivityDetail[] }>('/admin/activities');
}

export function createAdminActivity(body: AdminUpsertActivityRequest) {
  return apiRequest<ActivityDetail>('/admin/activities', { method: 'POST', body });
}

export function updateAdminActivity(activityId: string, body: AdminUpsertActivityRequest) {
  return apiRequest<ActivityDetail>(`/admin/activities/${activityId}`, { method: 'PUT', body });
}

export function changeAdminActivityStatus(activityId: string, body: AdminChangeStatusRequest) {
  return apiRequest<ActivityDetail>(`/admin/activities/${activityId}/status`, { method: 'POST', body });
}

export function listAdminRegistrations(activityId: string) {
  return apiRequest<{ items: AdminRegistrationRow[] }>(`/admin/activities/${activityId}/registrations`);
}

export function exportAdminRegistrationsCsv(activityId: string, body?: IdempotencyKeyBody) {
  return apiRequest<string>(`/admin/activities/${activityId}/registrations/export`, {
    method: 'POST',
    body,
    headers: { Accept: 'text/csv' },
  });
}
