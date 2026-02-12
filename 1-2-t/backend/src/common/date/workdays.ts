import {
  addDays,
  assertDateOnly,
  compareDateOnly,
  DateOnly,
} from './date-only';

function isWeekend(date: DateOnly): boolean {
  const [y, m, d] = date.split('-').map((n) => Number(n));
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  return day === 0 || day === 6;
}

export function countWorkdaysInclusive(
  startDate: DateOnly,
  endDate: DateOnly,
): number {
  assertDateOnly(startDate, 'start_date');
  assertDateOnly(endDate, 'end_date');
  if (compareDateOnly(endDate, startDate) < 0) {
    throw new Error('end_date must be >= start_date');
  }

  let count = 0;
  let cur = startDate;
  while (compareDateOnly(cur, endDate) <= 0) {
    if (!isWeekend(cur)) count += 1;
    cur = addDays(cur, 1);
  }
  return count;
}
