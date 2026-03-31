export type AlertProps = {
  tone?: 'info' | 'error'
  title?: string
  message: string
}

export function Alert({ tone = 'info', title, message }: AlertProps) {
  const classes =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-blue-200 bg-blue-50 text-blue-800'

  return (
    <div className={`rounded border p-3 text-sm ${classes}`}>
      {title ? <div className="font-semibold">{title}</div> : null}
      <div className={title ? 'mt-1' : ''}>{message}</div>
    </div>
  )
}
