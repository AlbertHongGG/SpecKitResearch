export function CalendarLegend({
  includeSubmitted,
  onToggle,
}: {
  includeSubmitted: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded border bg-white p-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeSubmitted}
          onChange={(e) => onToggle(e.target.checked)}
        />
        顯示 submitted
      </label>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-emerald-500" /> approved
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded bg-amber-500" /> submitted
      </div>
    </div>
  );
}
