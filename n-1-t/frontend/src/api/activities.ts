import { apiRequest } from './http';
import type { ActivityDetail, ActivitySummary } from './types';

export function listPublicActivities() {
  return apiRequest<{ items: ActivitySummary[] }>('/activities');
}

export function getPublicActivityDetail(activityId: string) {
  return apiRequest<ActivityDetail>(`/activities/${activityId}`);
}
