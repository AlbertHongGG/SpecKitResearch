import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveType } from '../../leave-requests/api/useLeaveTypes';

export interface LeaveBalanceItem {
  leave_type: LeaveType;
  quota: number;
  used: number;
  reserved: number;
  available: number;
}

export function useLeaveBalance(year?: number) {
  const qs = year ? `?year=${encodeURIComponent(String(year))}` : '';
  return useQuery({
    queryKey: ['leave-balance', year ?? 'current'],
    queryFn: async () => apiRequest<LeaveBalanceItem[]>(`/leave-balance${qs}`),
    staleTime: 30_000,
  });
}
