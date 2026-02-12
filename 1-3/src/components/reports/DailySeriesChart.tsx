'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function DailySeriesChart({
  data,
}: {
  data: Array<{ date: string; income: number; expense: number }>;
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="income" fill="#10b981" />
          <Bar dataKey="expense" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
