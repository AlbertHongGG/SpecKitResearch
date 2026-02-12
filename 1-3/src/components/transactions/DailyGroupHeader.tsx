import { formatAmount } from '@/lib/shared/money';

export function DailyGroupHeader({
  date,
  incomeTotal,
  expenseTotal,
}: {
  date: string;
  incomeTotal: number;
  expenseTotal: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2">
      <div>
        <div className="text-sm font-medium">{date}</div>
        <div className="text-xs text-neutral-600">
          收入 {formatAmount(incomeTotal)} / 支出 {formatAmount(expenseTotal)}
        </div>
      </div>
    </div>
  );
}
