import { Injectable } from '@nestjs/common';
import { LeaveRequestStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { addDaysUtc, formatDateOnly, parseDateOnly } from '../common/date/date-only';

@Injectable()
export class CalendarService {
    constructor(private readonly prisma: PrismaService) { }

    async getManagerCalendar(managerId: string, args: { view: 'month' | 'week'; start: string; end: string; includeSubmitted?: boolean }) {
        const managedEmployees = await this.prisma.user.findMany({
            where: { managerId },
            select: { id: true },
        });
        const ids = managedEmployees.map((u) => u.id);

        const start = parseDateOnly(args.start);
        const end = parseDateOnly(args.end);

        const statuses: LeaveRequestStatus[] = [LeaveRequestStatus.approved];
        if (args.includeSubmitted) statuses.push(LeaveRequestStatus.submitted);

        const requests = await this.prisma.leaveRequest.findMany({
            where: {
                userId: { in: ids },
                status: { in: statuses },
                startDate: { lte: end },
                endDate: { gte: start },
            },
            include: {
                user: { include: { department: true } },
                leaveType: true,
            },
            orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
        });

        return requests.map((r) => ({
            id: r.id,
            leaveRequestId: r.id,
            title: `${r.user.name} (${r.leaveType.name})`,
            start: formatDateOnly(r.startDate),
            end: formatDateOnly(addDaysUtc(r.endDate, 1)),
            allDay: true,
            status: r.status === LeaveRequestStatus.submitted ? 'submitted' : 'approved',
            employee: {
                name: r.user.name,
                departmentName: r.user.department.name,
            },
        }));
    }
}
