export function LoadingState(props: { label?: string }) {
  return (
    <div className="p-6 text-sm text-gray-600">{props.label ?? '載入中…'}</div>
  )
}
