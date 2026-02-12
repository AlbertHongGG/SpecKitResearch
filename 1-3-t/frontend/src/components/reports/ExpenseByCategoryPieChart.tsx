import { useMemo } from 'react';
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';

import type { CategorySpend } from '../../services/reports';

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

export function ExpenseByCategoryPieChart(props: { items: CategorySpend[] }) {
  const data = useMemo(() => {
    return props.items
      .filter((x) => x.amount > 0)
      .map((x) => ({ name: x.categoryName, value: x.amount, percent: x.percent }));
  }, [props.items]);

  if (data.length === 0) {
    return (
      <div className="rounded border bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">支出類別分布</h2>
        <p className="mt-2 text-sm text-slate-600">本月無支出</p>
      </div>
    );
  }

  return (
    <div className="rounded border bg-white p-4">
      <h2 className="text-base font-semibold text-slate-900">支出類別分布</h2>

      <div className="mt-4 h-64" role="img" aria-label="支出類別圓餅圖">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={90}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, item) => {
                const percent = (item?.payload?.percent as number | undefined) ?? 0;
                return [`${value}（${percent.toFixed(1)}%）`, '支出'];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-800">明細</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-600">
              <tr>
                <th className="py-2 pr-3">類別</th>
                <th className="py-2 pr-3">金額</th>
                <th className="py-2">佔比</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((x) => (
                <tr key={x.categoryId} className="border-t">
                  <td className="py-2 pr-3 text-slate-900">{x.categoryName}</td>
                  <td className="py-2 pr-3 text-slate-900">{x.amount}</td>
                  <td className="py-2 text-slate-900">{x.percent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
