import type React from 'react';

export function Button({
  children,
  variant = 'default',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'danger';
}) {
  const base = 'rounded px-3 py-2 text-sm font-medium disabled:opacity-50';
  const v =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : variant === 'danger'
        ? 'bg-rose-600 text-white hover:bg-rose-700'
        : 'border bg-white text-slate-900 hover:bg-slate-50';

  return (
    <button className={`${base} ${v} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
