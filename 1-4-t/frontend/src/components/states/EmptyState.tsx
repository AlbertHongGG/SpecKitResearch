export function EmptyState(props: { title: string; description?: string }) {
  return (
    <div className="rounded border bg-white p-6">
      <div className="text-base font-semibold">{props.title}</div>
      {props.description ? (
        <div className="mt-1 text-sm text-slate-600">{props.description}</div>
      ) : null}
    </div>
  )
}
