import { forwardRef, useId } from 'react'

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }
>(function TextArea({ label, error, className, id: idProp, ...props }, ref) {
  const autoId = useId()
  const id = idProp ?? autoId
  const errorId = `${id}-error`
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <textarea
        ref={ref}
        id={id}
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 w-full rounded border px-3 py-2 text-sm outline-none focus:border-slate-400 ${className ?? ''}`}
      />
      {error ? (
        <div id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </div>
      ) : null}
    </label>
  )
})
