export default function ProgressBadge(props: { completed: number; total: number }) {
  const pct = props.total ? Math.round((props.completed / props.total) * 100) : 0;
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
      {props.completed}/{props.total}（{pct}%）
    </span>
  );
}
