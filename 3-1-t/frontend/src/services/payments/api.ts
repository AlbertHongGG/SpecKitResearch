import { apiRequest } from '@/services/api/client';

export const paymentsApi = {
  get(paymentId: string) {
    return apiRequest(`/payments/${paymentId}`, { method: 'GET' });
  },
  retry(paymentId: string) {
    return apiRequest(`/payments/${paymentId}/retry`, { method: 'POST' });
  },
};
