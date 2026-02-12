import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveRequestStatus } from '../../leave-requests/api/leaveRequestsApi';
import { invalidateLeaveRequestRelated } from '../../leave-requests/api/queryInvalidation';

export function useRejectLeaveRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; reason: string }) =>
      apiRequest<{ id: string; status: LeaveRequestStatus }>(`/leave-requests/${args.id}/reject`, {
        method: 'POST',
        body: { reason: args.reason },
      }),
    onSuccess: async (res) => {
      await invalidateLeaveRequestRelated(qc, res.id);
    },
  });
}
