import { LeaveRequestStatus } from '@prisma/client';
import { rangesOverlapInclusive } from '../common/date/overlap';
import type { DateOnly } from '../common/date/date-only';

export const CONFLICT_STATUSES: LeaveRequestStatus[] = [
  LeaveRequestStatus.draft,
  LeaveRequestStatus.submitted,
  LeaveRequestStatus.approved,
];

export function hasDateConflict(
  existing: Array<{ id: string; startDate: string; endDate: string }>,
  startDate: DateOnly,
  endDate: DateOnly,
  excludeId?: string,
): boolean {
  return existing.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    return rangesOverlapInclusive(r.startDate, r.endDate, startDate, endDate);
  });
}
