import { Injectable } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class PendingApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForManager(managerId: string) {
    const reports = await this.prisma.user.findMany({
      where: { managerId },
      select: { id: true, name: true },
    });
    const reportIds = reports.map((r) => r.id);
    if (reportIds.length === 0) return [];

    const items = await this.prisma.leaveRequest.findMany({
      where: {
        status: LeaveRequestStatus.submitted,
        userId: { in: reportIds },
      },
      include: { leaveType: true, user: true },
      orderBy: { submittedAt: 'asc' },
    });

    return items.map((lr) => ({
      id: lr.id,
      leave_type: {
        id: lr.leaveType.id,
        name: lr.leaveType.name,
        annual_quota: lr.leaveType.annualQuota,
        carry_over: lr.leaveType.carryOver,
        require_attachment: lr.leaveType.requireAttachment,
        is_active: lr.leaveType.isActive,
      },
      start_date: lr.startDate,
      end_date: lr.endDate,
      days: lr.days,
      status: lr.status,
      submitted_at: lr.submittedAt,
      decided_at: lr.decidedAt,
      user: {
        id: lr.user.id,
        name: lr.user.name,
        email: lr.user.email,
        role: lr.user.role,
        department_id: lr.user.departmentId,
        manager_id: lr.user.managerId,
      },
    }));
  }
}
