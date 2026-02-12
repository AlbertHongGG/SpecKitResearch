import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AsyncState } from '../components/AsyncState';
import { toUserFacingMessage } from '../services/apiErrors';
import { getMonthlyReport } from '../services/reports';
import { MonthlySummaryCards } from '../components/reports/MonthlySummaryCards';
import { ExpenseByCategoryPieChart } from '../components/reports/ExpenseByCategoryPieChart';
import { DailyIncomeExpenseBarChart } from '../components/reports/DailyIncomeExpenseBarChart';
import { ExportCsvButton } from '../components/reports/ExportCsvButton';

function getDefaultYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function ReportsPage() {
  const defaults = getDefaultYearMonth();
  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);

  const reportQuery = useQuery({
    queryKey: ['reports', 'monthly', { year, month }],
    queryFn: () => getMonthlyReport({ year, month }),
  });

  const errorMessage = useMemo(() => {
    if (!reportQuery.error) return null;
    return toUserFacingMessage(reportQuery.error);
  }, [reportQuery.error]);

  const report = reportQuery.data;
  const hasAnyData = (report?.byDay?.length ?? 0) > 0;

  const nowYear = new Date().getFullYear();
  const years = [nowYear, nowYear - 1, nowYear - 2];

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">月報表</h1>
          <p className="text-sm text-slate-600">查看指定年月的統計與圖表</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="reportYear" className="block text-sm font-medium text-slate-800">
              年份
            </label>
            <select
              id="reportYear"
              className="mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="reportMonth" className="block text-sm font-medium text-slate-800">
              月份
            </label>
            <select
              id="reportMonth"
              className="mt-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <ExportCsvButton year={year} month={month} disabled={!hasAnyData || reportQuery.isLoading} />
        </div>
      </header>

      <AsyncState
        isLoading={reportQuery.isLoading}
        error={errorMessage}
        onRetry={() => {
          reportQuery.refetch();
        }}
      >
        {report ? (
          <div className="space-y-4">
            {!hasAnyData ? (
              <div className="rounded border bg-white p-4 text-sm text-slate-600">本月無資料</div>
            ) : null}

            <MonthlySummaryCards totals={report.totals} />

            <div className="grid gap-4 lg:grid-cols-2">
              <ExpenseByCategoryPieChart items={report.expenseByCategory} />
              <DailyIncomeExpenseBarChart items={report.byDay} />
            </div>
          </div>
        ) : null}
      </AsyncState>
    </section>
  );
}
