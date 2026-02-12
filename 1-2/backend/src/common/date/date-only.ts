export function parseDateOnly(dateStr: string): Date {
    // Store as UTC midnight to avoid local timezone surprises.
    return new Date(`${dateStr}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function addDaysUtc(date: Date, days: number): Date {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}
