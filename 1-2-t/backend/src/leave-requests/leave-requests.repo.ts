import { Injectable } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CONFLICT_STATUSES } from './leave-request.conflict';

@Injectable()
export class LeaveRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForConflictCheck(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    // broad filter to reduce rows; exact overlap checked in app logic
    return this.prisma.leaveRequest.findMany({
      where: {
        userId,
        status: { in: CONFLICT_STATUSES },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    });
  }

  async findById(id: string) {
    return this.prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        leaveType: true,
        user: true,
        approver: true,
        attachment: true,
      },
    });
  }

  async listMy(
    userId: string,
    filters: {
      status?: LeaveRequestStatus;
      leaveTypeId?: string;
      start?: string;
      end?: string;
    },
  ) {
    return this.prisma.leaveRequest.findMany({
      where: {
        userId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.leaveTypeId ? { leaveTypeId: filters.leaveTypeId } : {}),
        ...(filters.start ? { endDate: { gte: filters.start } } : {}),
        ...(filters.end ? { startDate: { lte: filters.end } } : {}),
      },
      include: { leaveType: true },
      orderBy: { startDate: 'desc' },
    });
  }
}
