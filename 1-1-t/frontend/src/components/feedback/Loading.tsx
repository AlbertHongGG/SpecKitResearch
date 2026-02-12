export function Loading(props: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-700">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <div className="text-sm">{props.label ?? 'Loading…'}</div>
    </div>
  );
}
