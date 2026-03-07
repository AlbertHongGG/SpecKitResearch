import { apiRequest } from '@/services/api/client';

export const cartApi = {
  get() {
    return apiRequest('/cart', { method: 'GET' });
  },
  addItem(payload: { productId: string; quantity: number }) {
    return apiRequest('/cart/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateItem(payload: { itemId: string; quantity: number }) {
    return apiRequest('/cart/items', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  removeItem(payload: { itemId: string }) {
    return apiRequest('/cart/items', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },
};
