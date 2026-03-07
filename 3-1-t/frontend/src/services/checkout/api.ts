import { apiRequest } from '@/services/api/client';

export function createCheckout(payload?: { note?: string }) {
  return apiRequest('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  });
}
