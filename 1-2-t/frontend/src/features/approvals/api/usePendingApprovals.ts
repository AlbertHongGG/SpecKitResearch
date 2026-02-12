import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveRequestListItem, UserSummary } from '../../leave-requests/api/leaveRequestsApi';

export type PendingApprovalItem = LeaveRequestListItem & { user: UserSummary };

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => apiRequest<PendingApprovalItem[]>('/leave-requests/pending-approvals'),
    refetchInterval: 30_000,
  });
}
