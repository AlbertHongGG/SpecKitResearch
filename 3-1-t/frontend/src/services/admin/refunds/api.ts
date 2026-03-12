import { apiRequest } from '@/services/api/client';

export const adminRefundsApi = {
  list() {
    return apiRequest('/admin/refunds', { method: 'GET' });
  },
  approve(id: string, approvedCents?: number) {
    return apiRequest(`/admin/refunds/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(approvedCents ? { approvedCents } : {}),
    });
  },
  reject(id: string) {
    return apiRequest(`/admin/refunds/${id}/reject`, { method: 'POST' });
  },
  forceRefund(id: string, approvedCents?: number) {
    return apiRequest(`/admin/refunds/${id}/force-refund`, {
      method: 'POST',
      body: JSON.stringify(approvedCents ? { approvedCents } : {}),
    });
  },
};
