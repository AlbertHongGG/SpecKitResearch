export function MyLeaveRequestsSort({
  value,
  onChange,
}: {
  value: 'start_date_desc' | 'start_date_asc';
  onChange: (next: 'start_date_desc' | 'start_date_asc') => void;
}) {
  return (
    <div className="rounded border bg-white p-4">
      <label className="block text-sm font-medium">排序</label>
      <select
        className="mt-1 w-64 rounded border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value as 'start_date_desc' | 'start_date_asc')}
      >
        <option value="start_date_desc">開始日期（新→舊）</option>
        <option value="start_date_asc">開始日期（舊→新）</option>
      </select>
    </div>
  );
}
