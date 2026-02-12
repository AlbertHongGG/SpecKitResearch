import { Injectable } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { LeaveRequestsRepository } from './leave-requests.repo';

@Injectable()
export class ListMyLeaveRequestsService {
  constructor(private readonly repo: LeaveRequestsRepository) {}

  async list(
    userId: string,
    filters: {
      status?: LeaveRequestStatus;
      leaveTypeId?: string;
      start?: string;
      end?: string;
      sort?: string;
    },
  ) {
    const rows = await this.repo.listMy(userId, {
      status: filters.status,
      leaveTypeId: filters.leaveTypeId,
      start: filters.start,
      end: filters.end,
    });

    const sorted = [...rows];
    if (filters.sort === 'start_date_asc') {
      sorted.sort((a, b) =>
        a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0,
      );
    } else {
      sorted.sort((a, b) =>
        a.startDate > b.startDate ? -1 : a.startDate < b.startDate ? 1 : 0,
      );
    }

    return sorted.map((r) => ({
      id: r.id,
      leave_type: {
        id: r.leaveType.id,
        name: r.leaveType.name,
        annual_quota: r.leaveType.annualQuota,
        carry_over: r.leaveType.carryOver,
        require_attachment: r.leaveType.requireAttachment,
        is_active: r.leaveType.isActive,
      },
      start_date: r.startDate,
      end_date: r.endDate,
      days: r.days,
      status: r.status,
      submitted_at: r.submittedAt,
      decided_at: r.decidedAt,
    }));
  }
}
