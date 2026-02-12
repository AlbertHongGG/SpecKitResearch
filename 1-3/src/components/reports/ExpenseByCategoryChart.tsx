'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export function ExpenseByCategoryChart({
  data,
}: {
  data: Array<{ categoryName: string; amount: number; percent: number }>;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="categoryName" outerRadius={110} />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
