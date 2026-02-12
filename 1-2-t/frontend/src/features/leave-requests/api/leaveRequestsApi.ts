import { apiRequest } from '../../../api/http';
import type { LeaveType } from './useLeaveTypes';

export type LeaveRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequestListItem {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  status: LeaveRequestStatus;
  submitted_at: string | null;
  decided_at: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  department_id: string;
  manager_id: string | null;
}

export interface LeaveRequestDetail extends LeaveRequestListItem {
  user: UserSummary;
  reason: string;
  attachment_url: string | null;
  approver: UserSummary | null;
  rejection_reason: string | null;
  cancelled_at: string | null;
}

export interface CreateLeaveRequestRequest {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_id?: string | null;
}

export async function createLeaveRequestDraft(req: CreateLeaveRequestRequest) {
  return apiRequest<LeaveRequestListItem>('/leave-requests', { method: 'POST', body: req });
}

export interface UpdateLeaveRequestRequest {
  leave_type_id?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  attachment_id?: string | null;
}

export async function updateLeaveRequestDraft(id: string, req: UpdateLeaveRequestRequest) {
  return apiRequest<LeaveRequestListItem>(`/leave-requests/${id}`, { method: 'PATCH', body: req });
}

export async function submitLeaveRequest(id: string) {
  return apiRequest<{ id: string; status: LeaveRequestStatus }>(`/leave-requests/${id}/submit`, { method: 'POST' });
}

export async function getLeaveRequestById(id: string) {
  return apiRequest<LeaveRequestDetail>(`/leave-requests/${id}`);
}
