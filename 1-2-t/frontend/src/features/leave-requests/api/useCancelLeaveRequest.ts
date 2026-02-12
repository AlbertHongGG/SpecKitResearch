import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveRequestStatus } from './leaveRequestsApi';
import { invalidateLeaveRequestRelated } from './queryInvalidation';

export function useCancelLeaveRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) =>
      apiRequest<{ id: string; status: LeaveRequestStatus }>(`/leave-requests/${id}/cancel`, { method: 'POST' }),
    onSuccess: async (res) => {
      await invalidateLeaveRequestRelated(qc, res.id);
    },
  });
}
