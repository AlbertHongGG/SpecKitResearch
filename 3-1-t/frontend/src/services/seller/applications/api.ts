import { apiRequest } from '@/services/api/client';

export const sellerApplicationsApi = {
  submit(note?: string) {
    return apiRequest('/seller/applications/submit', {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },
  status() {
    return apiRequest('/seller/applications/status', { method: 'GET' });
  },
};
