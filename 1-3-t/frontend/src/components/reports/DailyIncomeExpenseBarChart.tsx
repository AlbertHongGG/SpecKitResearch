import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

import type { DayIncomeExpense } from '../../services/reports';

function formatTick(date: string) {
  // YYYY-MM-DD -> MM/DD
  return date.slice(5).replace('-', '/');
}

export function DailyIncomeExpenseBarChart(props: { items: DayIncomeExpense[] }) {
  const data = useMemo(() => {
    return props.items.map((x) => ({
      date: x.date,
      dateLabel: formatTick(x.date),
      income: x.incomeAmount,
      expense: x.expenseAmount,
    }));
  }, [props.items]);

  if (data.length === 0) {
    return (
      <div className="rounded border bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">每日收支</h2>
        <p className="mt-2 text-sm text-slate-600">本月無資料</p>
      </div>
    );
  }

  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900">每日收支</h2>

      <div className="mt-4 h-72" role="img" aria-label="每日收支長條圖">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="dateLabel" />
            <YAxis />
            <Tooltip
              formatter={(value: number, name: string) => {
                const label = name === 'income' ? '收入' : '支出';
                return [String(value), label];
              }}
              labelFormatter={(_, items) => {
                const raw = items?.[0]?.payload?.date as string | undefined;
                return raw ?? '';
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === 'income') return '收入';
                if (value === 'expense') return '支出';
                return String(value);
              }}
            />
            <Bar dataKey="income" fill="#059669" />
            <Bar dataKey="expense" fill="#e11d48" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-800">明細</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="py-2 pr-3">日期</th>
                <th className="py-2 pr-3">收入</th>
                <th className="py-2">支出</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((x) => (
                <tr key={x.date} className="border-t">
                  <td className="py-2 pr-3 text-slate-900">{x.date}</td>
                  <td className="py-2 pr-3 text-slate-900">{x.incomeAmount}</td>
                  <td className="py-2 text-slate-900">{x.expenseAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
