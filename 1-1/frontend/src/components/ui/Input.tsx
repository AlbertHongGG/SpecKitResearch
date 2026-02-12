import { forwardRef, type InputHTMLAttributes } from 'react'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  props,
  ref,
) {
  const { className = '', ...rest } = props
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 ${className}`}
      {...rest}
    />
  )
})
