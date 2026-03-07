import { apiRequest } from '@/services/api/client';

export function createRefundRequest(payload: {
  subOrderId: string;
  reason: string;
  requestedCents: number;
}) {
  return apiRequest('/refund-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
