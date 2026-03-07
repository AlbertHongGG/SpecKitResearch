import { apiRequest } from '@/services/api/client';

export const sellerOrdersApi = {
  list() {
    return apiRequest('/seller/orders', { method: 'GET' });
  },
  detail(subOrderId: string) {
    return apiRequest(`/seller/orders/${subOrderId}`, { method: 'GET' });
  },
  ship(subOrderId: string) {
    return apiRequest(`/seller/orders/${subOrderId}/ship`, { method: 'POST' });
  },
};
