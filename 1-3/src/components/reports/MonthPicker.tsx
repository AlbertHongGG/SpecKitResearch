'use client';

import { Select } from '@/components/ui/Select';

export function MonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (next: { year: number; month: number }) => void;
}) {
  const years = [year, year - 1, year - 2];

  return (
    <div className="flex gap-2">
      <Select value={String(year)} onChange={(e) => onChange({ year: Number(e.target.value), month })}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
      <Select value={String(month)} onChange={(e) => onChange({ year, month: Number(e.target.value) })}>
        {Array.from({ length: 12 }).map((_, i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1} 月
          </option>
        ))}
      </Select>
    </div>
  );
}
