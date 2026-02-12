import { LeaveRequestStatus } from '@prisma/client';

export function toDepartmentCalendarEvent(row: {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveRequestStatus;
  user: { id: string; name: string };
}) {
  return {
    leave_request_id: row.id,
    employee: { id: row.user.id, name: row.user.name },
    start_date: row.startDate,
    end_date: row.endDate,
    days: row.days,
    status: row.status,
  };
}
