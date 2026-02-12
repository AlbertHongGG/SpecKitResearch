import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
};

const base =
  'inline-flex items-center justify-center rounded px-3 py-2 text-sm font-medium transition disabled:opacity-50';

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-black text-white hover:bg-neutral-800',
  secondary: 'bg-neutral-200 text-black hover:bg-neutral-300',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={[base, variants[variant], className].filter(Boolean).join(' ')}
    />
  );
}
