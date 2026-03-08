import dayjs from 'dayjs';

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? dayjs(value) : dayjs(value);
  if (!d.isValid()) return String(value);
  return d.format('YYYY-MM-DD HH:mm:ss');
}
