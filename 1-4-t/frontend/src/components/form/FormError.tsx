export function FormError(props: { message?: string }) {
  if (!props.message) return null
  return (
    <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {props.message}
    </div>
  )
}
