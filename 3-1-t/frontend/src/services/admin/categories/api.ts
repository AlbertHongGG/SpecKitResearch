import { apiRequest } from '@/services/api/client';

export const adminCategoriesApi = {
  list() {
    return apiRequest('/admin/categories', { method: 'GET' });
  },
  create(payload: { name: string }) {
    return apiRequest('/admin/categories', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id: string, payload: { name?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    return apiRequest(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
