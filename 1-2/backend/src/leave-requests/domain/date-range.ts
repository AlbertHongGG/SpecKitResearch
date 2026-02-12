import { expandDatesInclusiveUtc } from '../../common/date/business-days';

export function expandDateRangeInclusiveUtc(start: Date, end: Date): Date[] {
    return expandDatesInclusiveUtc(start, end);
}
