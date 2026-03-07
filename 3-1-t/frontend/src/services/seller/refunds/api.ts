import { apiRequest } from '@/services/api/client';

export const sellerRefundsApi = {
  approve(id: string) {
    return apiRequest(`/seller/refunds/${id}/approve`, { method: 'POST' });
  },
  reject(id: string) {
    return apiRequest(`/seller/refunds/${id}/reject`, { method: 'POST' });
  },
};
