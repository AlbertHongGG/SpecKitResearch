'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';
import { MonthPicker } from '@/components/reports/MonthPicker';
import { MonthlyTotalsCards } from '@/components/reports/MonthlyTotalsCards';
import { ExpenseByCategoryChart } from '@/components/reports/ExpenseByCategoryChart';
import { DailySeriesChart } from '@/components/reports/DailySeriesChart';
import { ReportEmptyState } from '@/components/reports/ReportEmptyState';
import { ExportCsvButton } from '@/components/reports/ExportCsvButton';
import { useMonthlyReport } from '@/lib/shared/hooks/useMonthlyReport';

export default function ReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data, isLoading, error } = useMonthlyReport(ym);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h1 className="text-lg font-semibold">月報表</h1>
            <div className="flex items-center gap-2">
              <MonthPicker year={ym.year} month={ym.month} onChange={setYm} />
              <ExportCsvButton year={ym.year} month={ym.month} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : null}
          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-700">{(error as any).message ?? '載入失敗'}</Alert>
          ) : null}

          {data ? (
            <div className="space-y-6">
              <MonthlyTotalsCards totals={data.totals} />

              {data.totals.income === 0 && data.totals.expense === 0 ? (
                <ReportEmptyState />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <h2 className="text-sm font-semibold">支出類別分布</h2>
                    </CardHeader>
                    <CardContent>
                      {data.expenseByCategory.length === 0 ? <ReportEmptyState /> : <ExpenseByCategoryChart data={data.expenseByCategory} />}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <h2 className="text-sm font-semibold">每日收支</h2>
                    </CardHeader>
                    <CardContent>
                      <DailySeriesChart data={data.dailySeries} />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
