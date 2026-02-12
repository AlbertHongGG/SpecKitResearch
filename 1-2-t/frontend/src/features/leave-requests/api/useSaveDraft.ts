import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createLeaveRequestDraft,
  updateLeaveRequestDraft,
  type CreateLeaveRequestRequest,
  type UpdateLeaveRequestRequest,
} from './leaveRequestsApi';

export function useSaveDraft() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id?: string; payload: CreateLeaveRequestRequest | UpdateLeaveRequestRequest }) => {
      if (args.id) return updateLeaveRequestDraft(args.id, args.payload as UpdateLeaveRequestRequest);
      return createLeaveRequestDraft(args.payload as CreateLeaveRequestRequest);
    },
    onSuccess: async (lr) => {
      await qc.invalidateQueries({ queryKey: ['leave-request', lr.id] });
    },
  });
}
