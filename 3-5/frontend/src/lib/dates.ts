import { format } from 'date-fns';

export function formatDateTime(value: string | number | Date): string {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, 'yyyy-MM-dd HH:mm');
}
