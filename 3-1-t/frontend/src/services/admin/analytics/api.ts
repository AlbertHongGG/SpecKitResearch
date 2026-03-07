import { apiRequest } from '@/services/api/client';

export function fetchAdminAnalytics() {
  return apiRequest('/admin/analytics', { method: 'GET' });
}
