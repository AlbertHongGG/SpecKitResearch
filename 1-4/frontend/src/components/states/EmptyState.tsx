export function EmptyState(props: { title: string; description?: string }) {
  return (
    <div className="p-6">
      <div className="text-lg font-semibold">{props.title}</div>
      {props.description ? (
        <div className="mt-2 text-sm text-gray-600">{props.description}</div>
      ) : null}
    </div>
  )
}
