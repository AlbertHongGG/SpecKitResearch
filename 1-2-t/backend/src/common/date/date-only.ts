const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DateOnly = string;

export function assertDateOnly(
  value: string,
  fieldName = 'date',
): asserts value is DateOnly {
  if (!DATE_ONLY_RE.test(value)) {
    throw new Error(`${fieldName} must be YYYY-MM-DD`);
  }
  const [y, m, d] = value.split('-').map((n) => Number(n));
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new Error(`${fieldName} is not a valid calendar date`);
  }
}

export function compareDateOnly(a: DateOnly, b: DateOnly): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addDays(date: DateOnly, days: number): DateOnly {
  assertDateOnly(date);
  const [y, m, d] = date.split('-').map((n) => Number(n));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
