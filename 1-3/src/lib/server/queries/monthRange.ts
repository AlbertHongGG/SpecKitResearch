import { ApiError } from '@/lib/shared/apiError';
import { getMonthRange, isValidMonth, toDateKey } from '@/lib/shared/dateRange';

export function getMonthDateKeysOrThrow(year: number, month: number) {
  if (!isValidMonth(year, month)) {
    throw new ApiError({ status: 422, code: 'INVALID_MONTH', message: '年月不合法' });
  }

  const { start, end } = getMonthRange(year, month);
  return {
    from: toDateKey(start),
    to: toDateKey(end),
  };
}
