import { apiFetch } from '../../lib/apiClient';

export type LeaveRequestStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';

export type LeaveRequestSummary = {
    id: string;
    leaveType: { id: string; name: string };
    startDate: string;
    endDate: string;
    days: number;
    status: LeaveRequestStatus;
    createdAt: string;
    submittedAt: string | null;
};

export type LeaveRequestDetail = {
    id: string;
    employee: { id: string; name: string; department: { id: string; name: string } };
    leaveType: { id: string; name: string; annualQuota: number; carryOver: boolean; requireAttachment: boolean; isActive: boolean };
    startDate: string;
    endDate: string;
    days: number;
    reason: string | null;
    status: LeaveRequestStatus;
    createdAt: string;
    submittedAt: string | null;
    cancelledAt: string | null;
    decidedAt: string | null;
    rejectionReason: string | null;
    approver: { id: string; name: string; department: { id: string; name: string } } | null;
    attachment: { id: string; originalFilename: string; mimeType: string; sizeBytes: number } | null;
};

export async function listMyLeaveRequests(params?: { status?: string; leaveTypeId?: string; start?: string; end?: string; sort?: string }) {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.leaveTypeId) qs.set('leaveTypeId', params.leaveTypeId);
    if (params?.start) qs.set('start', params.start);
    if (params?.end) qs.set('end', params.end);
    if (params?.sort) qs.set('sort', params.sort);

    const res = await apiFetch<{ items: LeaveRequestSummary[] }>(`/me/leave-requests?${qs.toString()}`);
    return res.items;
}

export async function getMyLeaveRequest(id: string) {
    return apiFetch<LeaveRequestDetail>(`/me/leave-requests/${id}`);
}

export async function createDraft(input: { leaveTypeId: string; startDate: string; endDate: string; reason?: string; attachmentId?: string }) {
    return apiFetch<LeaveRequestDetail>('/me/leave-requests', { method: 'POST', json: input });
}

export async function updateDraft(id: string, input: { leaveTypeId: string; startDate: string; endDate: string; reason?: string; attachmentId?: string }) {
    return apiFetch<LeaveRequestDetail>(`/me/leave-requests/${id}`, { method: 'PATCH', json: input });
}

export async function submitLeaveRequest(id: string) {
    return apiFetch<LeaveRequestDetail>(`/me/leave-requests/${id}/submit`, { method: 'POST' });
}

export async function cancelLeaveRequest(id: string) {
    return apiFetch<LeaveRequestDetail>(`/me/leave-requests/${id}/cancel`, { method: 'POST' });
}
