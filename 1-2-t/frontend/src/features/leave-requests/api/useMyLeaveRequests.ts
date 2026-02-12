import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveRequestListItem, LeaveRequestStatus } from './leaveRequestsApi';

export function useMyLeaveRequests(filters: {
  status?: LeaveRequestStatus;
  leaveTypeId?: string;
  start?: string;
  end?: string;
  sort?: 'start_date_desc' | 'start_date_asc';
}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.leaveTypeId) params.set('leaveTypeId', filters.leaveTypeId);
  if (filters.start) params.set('start', filters.start);
  if (filters.end) params.set('end', filters.end);
  if (filters.sort) params.set('sort', filters.sort);

  const qs = params.toString();

  return useQuery({
    queryKey: ['my-leave-requests', filters],
    queryFn: async () => apiRequest<LeaveRequestListItem[]>(`/leave-requests${qs ? `?${qs}` : ''}`),
  });
}
