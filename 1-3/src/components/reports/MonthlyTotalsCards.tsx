import { Card, CardContent } from '@/components/ui/Card';
import { formatAmount } from '@/lib/shared/money';

export function MonthlyTotalsCards({ totals }: { totals: { income: number; expense: number; net: number } }) {
  const items = [
    { label: '總收入', value: totals.income, tone: 'text-emerald-700' },
    { label: '總支出', value: totals.expense, tone: 'text-red-700' },
    { label: '淨收支', value: totals.net, tone: totals.net >= 0 ? 'text-emerald-700' : 'text-red-700' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="py-4">
            <div className="text-xs text-neutral-600">{it.label}</div>
            <div className={`mt-1 text-xl font-semibold ${it.tone}`}>{formatAmount(it.value)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
