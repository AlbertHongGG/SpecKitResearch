import type { MonthlyTotals } from '../../services/reports';

export function MonthlySummaryCards(props: { totals: MonthlyTotals }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded border bg-white p-4">
        <p className="text-sm text-slate-600">總收入</p>
        <p className="mt-1 text-xl font-semibold text-emerald-700">{props.totals.totalIncome}</p>
      </div>
      <div className="rounded border bg-white p-4">
        <p className="text-sm text-slate-600">總支出</p>
        <p className="mt-1 text-xl font-semibold text-rose-700">{props.totals.totalExpense}</p>
      </div>
      <div className="rounded border bg-white p-4">
        <p className="text-sm text-slate-600">淨收支</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">{props.totals.net}</p>
      </div>
    </div>
  );
}
