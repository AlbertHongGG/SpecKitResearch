import { addDaysUtc } from './date-only';

export function isWeekendUtc(date: Date): boolean {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
}

export function countBusinessDaysInclusiveUtc(start: Date, end: Date): number {
    if (end.getTime() < start.getTime()) return 0;

    let count = 0;
    for (let d = new Date(start.getTime()); d.getTime() <= end.getTime(); d = addDaysUtc(d, 1)) {
        if (!isWeekendUtc(d)) count += 1;
    }
    return count;
}

export function expandDatesInclusiveUtc(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    if (end.getTime() < start.getTime()) return dates;

    for (let d = new Date(start.getTime()); d.getTime() <= end.getTime(); d = addDaysUtc(d, 1)) {
        dates.push(d);
    }
    return dates;
}
