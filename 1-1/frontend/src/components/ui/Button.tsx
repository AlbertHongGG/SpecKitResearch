import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger'

export function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant },
) {
  const { variant = 'primary', className = '', ...rest } = props

  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60'

  const styles: Record<Variant, string> = {
    primary: 'bg-gray-900 text-white hover:bg-gray-800',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-500',
  }

  return <button className={`${base} ${styles[variant]} ${className}`} {...rest} />
}
