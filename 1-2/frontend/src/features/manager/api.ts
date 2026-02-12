import { apiFetch } from '../../lib/apiClient';
import type { LeaveRequestDetail } from '../leaveRequests/api';

export type ManagerPendingLeaveRequest = {
    id: string;
    employee: { id: string; name: string; department: { id: string; name: string } };
    leaveType: { id: string; name: string; annualQuota: number; carryOver: boolean; requireAttachment: boolean; isActive: boolean };
    startDate: string;
    endDate: string;
    days: number;
    submittedAt: string;
};

export async function listPending(params?: { start?: string; end?: string; leaveTypeId?: string; employeeId?: string }) {
    const qs = new URLSearchParams();
    if (params?.start) qs.set('start', params.start);
    if (params?.end) qs.set('end', params.end);
    if (params?.leaveTypeId) qs.set('leaveTypeId', params.leaveTypeId);
    if (params?.employeeId) qs.set('employeeId', params.employeeId);

    const res = await apiFetch<{ items: ManagerPendingLeaveRequest[] }>(`/manager/pending-leave-requests?${qs.toString()}`);
    return res.items;
}

export async function approveLeaveRequest(id: string) {
    return apiFetch<LeaveRequestDetail>(`/manager/leave-requests/${id}/approve`, { method: 'POST' });
}

export async function rejectLeaveRequest(id: string, rejectionReason: string) {
    return apiFetch<LeaveRequestDetail>(`/manager/leave-requests/${id}/reject`, { method: 'POST', json: { rejectionReason } });
}
