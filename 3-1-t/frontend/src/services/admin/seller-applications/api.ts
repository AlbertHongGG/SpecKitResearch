import { apiRequest } from '@/services/api/client';

export const adminSellerApplicationsApi = {
  list() {
    return apiRequest('/admin/seller-applications', { method: 'GET' });
  },
  approve(id: string) {
    return apiRequest(`/admin/seller-applications/${id}/approve`, { method: 'POST' });
  },
  reject(id: string) {
    return apiRequest(`/admin/seller-applications/${id}/reject`, { method: 'POST' });
  },
};
