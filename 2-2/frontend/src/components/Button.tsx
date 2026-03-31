import type { ButtonHTMLAttributes } from 'react'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded px-3 py-2 text-sm font-medium disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50'

  return <button className={[base, styles, className].filter(Boolean).join(' ')} {...props} />
}
