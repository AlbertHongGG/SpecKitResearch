import { apiRequest } from '@/services/api/client';

export const sellerProductsApi = {
  list() {
    return apiRequest('/seller/products', { method: 'GET' });
  },
  create(payload: unknown) {
    return apiRequest('/seller/products', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id: string, payload: unknown) {
    return apiRequest(`/seller/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
};
