import { apiRequest } from '@/services/api/client';

export const adminDisputesApi = {
  list() {
    return apiRequest('/admin/disputes', { method: 'GET' });
  },
  resolve(id: string, resolution: string) {
    return apiRequest(`/admin/disputes/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution }),
    });
  },
};
