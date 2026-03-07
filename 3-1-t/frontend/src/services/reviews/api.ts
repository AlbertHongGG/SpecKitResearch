import { apiRequest } from '@/services/api/client';

export function createReview(payload: { productId: string; rating: number; comment: string }) {
  return apiRequest('/reviews', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
