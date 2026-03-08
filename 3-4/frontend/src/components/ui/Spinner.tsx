export function Spinner(props: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
      <span>{props.label ?? 'Loading...'}</span>
    </div>
  );
}
