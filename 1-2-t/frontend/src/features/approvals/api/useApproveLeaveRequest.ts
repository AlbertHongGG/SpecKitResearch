import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveRequestStatus } from '../../leave-requests/api/leaveRequestsApi';
import { invalidateLeaveRequestRelated } from '../../leave-requests/api/queryInvalidation';

export function useApproveLeaveRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; note?: string }) =>
      apiRequest<{ id: string; status: LeaveRequestStatus }>(`/leave-requests/${args.id}/approve`, {
        method: 'POST',
        body: args.note ? { note: args.note } : {},
      }),
    onSuccess: async (res) => {
      await invalidateLeaveRequestRelated(qc, res.id);
    },
  });
}
