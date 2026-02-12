export function Alert(props: { title: string; description?: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div className="font-medium">{props.title}</div>
      {props.description ? <div className="mt-1">{props.description}</div> : null}
    </div>
  )
}
