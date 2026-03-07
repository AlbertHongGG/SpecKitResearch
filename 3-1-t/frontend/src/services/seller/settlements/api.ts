import { apiRequest } from '@/services/api/client';

export const sellerSettlementsApi = {
  list() {
    return apiRequest('/seller/settlements', { method: 'GET' });
  },
  detail(id: string) {
    return apiRequest(`/seller/settlements/${id}`, { method: 'GET' });
  },
};
