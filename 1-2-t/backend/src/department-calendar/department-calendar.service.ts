import { Injectable } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { toDepartmentCalendarEvent } from './department-calendar.mapper';

function monthRange(month: string): { start: string; end: string } {
  // month: YYYY-MM
  const m = /^\d{4}-\d{2}$/.test(month) ? month : null;
  if (!m) throw new Error('month must be YYYY-MM');
  const [yStr, moStr] = month.split('-');
  const y = Number(yStr);
  const mo = Number(moStr);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

@Injectable()
export class DepartmentCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async getForManager(
    managerId: string,
    month: string,
    includeSubmitted: boolean,
  ) {
    const { start, end } = monthRange(month);

    const reports = await this.prisma.user.findMany({
      where: { managerId },
      select: { id: true },
    });
    const reportIds = reports.map((r) => r.id);
    if (reportIds.length === 0) return [];

    const statuses: LeaveRequestStatus[] = includeSubmitted
      ? [LeaveRequestStatus.approved, LeaveRequestStatus.submitted]
      : [LeaveRequestStatus.approved];

    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        userId: { in: reportIds },
        status: { in: statuses },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ startDate: 'asc' }, { userId: 'asc' }],
    });

    return rows.map(toDepartmentCalendarEvent);
  }
}
