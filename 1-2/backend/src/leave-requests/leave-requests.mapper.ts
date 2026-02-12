import type { Attachment, Department, LeaveRequest, LeaveType, User } from '@prisma/client';
import { formatDateOnly } from '../common/date/date-only';

export function toLeaveRequestDetail(params: {
    request: LeaveRequest;
    employee: User & { department: Department };
    leaveType: LeaveType;
    approver?: (User & { department: Department }) | null;
    attachment?: Attachment | null;
}) {
    const { request, employee, leaveType, approver, attachment } = params;

    return {
        id: request.id,
        employee: {
            id: employee.id,
            name: employee.name,
            department: { id: employee.department.id, name: employee.department.name },
        },
        leaveType: {
            id: leaveType.id,
            name: leaveType.name,
            annualQuota: leaveType.annualQuota,
            carryOver: leaveType.carryOver,
            requireAttachment: leaveType.requireAttachment,
            isActive: leaveType.isActive,
        },
        startDate: formatDateOnly(request.startDate),
        endDate: formatDateOnly(request.endDate),
        days: request.days,
        reason: request.reason,
        attachment: attachment
            ? {
                id: attachment.id,
                originalFilename: attachment.originalFilename,
                mimeType: attachment.mimeType,
                sizeBytes: attachment.sizeBytes,
                createdAt: attachment.createdAt.toISOString(),
            }
            : null,
        status: request.status,
        submittedAt: request.submittedAt?.toISOString() ?? null,
        decidedAt: request.decidedAt?.toISOString() ?? null,
        approver: approver
            ? {
                id: approver.id,
                name: approver.name,
                role: approver.role,
                department: { id: approver.department.id, name: approver.department.name },
            }
            : null,
        rejectionReason: request.rejectionReason,
    };
}

export function toLeaveRequestSummary(request: LeaveRequest) {
    return {
        id: request.id,
        leaveTypeId: request.leaveTypeId,
        startDate: formatDateOnly(request.startDate),
        endDate: formatDateOnly(request.endDate),
        days: request.days,
        status: request.status,
        submittedAt: request.submittedAt?.toISOString() ?? null,
        decidedAt: request.decidedAt?.toISOString() ?? null,
    };
}
