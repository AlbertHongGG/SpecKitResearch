import {
  addDays,
  assertDateOnly,
  compareDateOnly,
  DateOnly,
} from './date-only';

export function rangesOverlapInclusive(
  aStart: DateOnly,
  aEnd: DateOnly,
  bStart: DateOnly,
  bEnd: DateOnly,
): boolean {
  assertDateOnly(aStart);
  assertDateOnly(aEnd);
  assertDateOnly(bStart);
  assertDateOnly(bEnd);

  const aEndExclusive = addDays(aEnd, 1);
  const bEndExclusive = addDays(bEnd, 1);

  // overlap for half-open intervals: start < otherEnd && end > otherStart
  return (
    compareDateOnly(aStart, bEndExclusive) < 0 &&
    compareDateOnly(aEndExclusive, bStart) > 0
  );
}
