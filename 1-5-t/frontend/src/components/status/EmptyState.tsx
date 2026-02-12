export function EmptyState(props: { title: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
      <div className="text-sm font-medium">{props.title}</div>
      {props.description ? <div className="mt-1 text-sm text-slate-600">{props.description}</div> : null}
    </div>
  );
}
