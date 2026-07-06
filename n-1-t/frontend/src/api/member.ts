import { apiRequest } from './http';
import type { ActivitySummary, IdempotencyKeyBody, RegistrationResult } from './types';

export function registerForActivity(activityId: string, body?: IdempotencyKeyBody) {
  return apiRequest<RegistrationResult>(`/activities/${activityId}/registrations`, {
    method: 'POST',
    body,
  });
}

export function cancelRegistration(activityId: string, body?: IdempotencyKeyBody) {
  return apiRequest<RegistrationResult>(`/activities/${activityId}/registrations`, {
    method: 'DELETE',
    body,
  });
}

export function listMyActivities() {
  return apiRequest<{ items: ActivitySummary[] }>('/my-activities');
}
