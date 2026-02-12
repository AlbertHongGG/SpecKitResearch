import { countBusinessDaysInclusiveUtc, expandDatesInclusiveUtc, isWeekendUtc } from './business-days';
import { parseDateOnly } from './date-only';

describe('business-days', () => {
    it('detects weekends (UTC)', () => {
        expect(isWeekendUtc(new Date('2026-02-07T00:00:00.000Z'))).toBe(true); // Sat
        expect(isWeekendUtc(new Date('2026-02-08T00:00:00.000Z'))).toBe(true); // Sun
        expect(isWeekendUtc(new Date('2026-02-09T00:00:00.000Z'))).toBe(false); // Mon
    });

    it('counts business days inclusive (UTC)', () => {
        // 2026-02-06 (Fri) ~ 2026-02-09 (Mon) => Fri + Mon = 2
        const start = parseDateOnly('2026-02-06');
        const end = parseDateOnly('2026-02-09');
        expect(countBusinessDaysInclusiveUtc(start, end)).toBe(2);
    });

    it('expands inclusive range', () => {
        const start = parseDateOnly('2026-02-03');
        const end = parseDateOnly('2026-02-05');
        const expanded = expandDatesInclusiveUtc(start, end).map((d) => d.toISOString().slice(0, 10));
        expect(expanded).toEqual(['2026-02-03', '2026-02-04', '2026-02-05']);
    });

    it('returns 0 when end < start', () => {
        const start = parseDateOnly('2026-02-05');
        const end = parseDateOnly('2026-02-03');
        expect(countBusinessDaysInclusiveUtc(start, end)).toBe(0);
        expect(expandDatesInclusiveUtc(start, end)).toHaveLength(0);
    });
});
