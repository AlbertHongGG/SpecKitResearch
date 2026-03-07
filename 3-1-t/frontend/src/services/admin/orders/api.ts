import { apiRequest } from '@/services/api/client';

export const adminOrdersApi = {
  list(buyerId?: string) {
    const suffix = buyerId ? `?buyerId=${encodeURIComponent(buyerId)}` : '';
    return apiRequest(`/admin/orders${suffix}`, { method: 'GET' });
  },
  detail(id: string) {
    return apiRequest(`/admin/orders/${id}`, { method: 'GET' });
  },
  forceCancel(id: string) {
    return apiRequest(`/admin/orders/${id}/force-cancel`, { method: 'POST' });
  },
  forceRefund(id: string) {
    return apiRequest(`/admin/orders/${id}/force-refund`, { method: 'POST' });
  },
};
