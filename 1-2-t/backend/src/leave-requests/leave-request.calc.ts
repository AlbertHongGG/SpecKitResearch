import { countWorkdaysInclusive } from '../common/date/workdays';
import type { DateOnly } from '../common/date/date-only';

export function calculateLeaveDays(
  startDate: DateOnly,
  endDate: DateOnly,
): number {
  return countWorkdaysInclusive(startDate, endDate);
}
