import { apiRequest } from '@/services/api/client';

export const adminRefundsApi = {
  list() {
    return apiRequest('/admin/refunds', { method: 'GET' });
  },
  approve(id: string) {
    return apiRequest(`/admin/refunds/${id}/approve`, { method: 'POST' });
  },
  reject(id: string) {
    return apiRequest(`/admin/refunds/${id}/reject`, { method: 'POST' });
  },
  forceRefund(id: string) {
    return apiRequest(`/admin/refunds/${id}/force-refund`, { method: 'POST' });
  },
};
