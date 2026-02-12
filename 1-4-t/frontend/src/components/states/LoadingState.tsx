export function LoadingState(props: { label?: string }) {
  return (
    <div className="rounded border bg-white p-4 text-sm text-slate-600">
      {props.label ?? '載入中…'}
    </div>
  )
}
