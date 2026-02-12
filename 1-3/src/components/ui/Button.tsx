import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const base =
  'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-800',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
  ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ className = '', variant = 'primary', ...props }: Props) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
