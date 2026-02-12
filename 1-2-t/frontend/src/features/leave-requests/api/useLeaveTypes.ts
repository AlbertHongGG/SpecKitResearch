import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';

export interface LeaveType {
  id: string;
  name: string;
  annual_quota: number;
  carry_over: boolean;
  require_attachment: boolean;
  is_active: boolean;
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => apiRequest<LeaveType[]>('/leave-types'),
    staleTime: 5 * 60_000,
  });
}
