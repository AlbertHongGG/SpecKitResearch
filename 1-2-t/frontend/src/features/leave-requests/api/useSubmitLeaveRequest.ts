import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitLeaveRequest } from './leaveRequestsApi';

export function useSubmitLeaveRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => submitLeaveRequest(id),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['leave-request', res.id] });
      await qc.invalidateQueries({ queryKey: ['my-leave-requests'] });
    },
  });
}
