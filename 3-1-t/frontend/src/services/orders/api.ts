import { apiRequest } from '@/services/api/client';

export const ordersApi = {
  list() {
    return apiRequest('/orders', { method: 'GET' });
  },
  detail(orderId: string) {
    return apiRequest(`/orders/${orderId}`, { method: 'GET' });
  },
  subOrder(orderId: string, subOrderId: string) {
    return apiRequest(`/orders/${orderId}/suborders/${subOrderId}`, { method: 'GET' });
  },
  cancel(orderId: string) {
    return apiRequest(`/orders/${orderId}/cancel`, { method: 'POST' });
  },
  deliver(orderId: string, subOrderId: string) {
    return apiRequest(`/orders/${orderId}/suborders/${subOrderId}/deliver`, { method: 'POST' });
  },
};
