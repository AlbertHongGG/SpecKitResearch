import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function Button(
  props: PropsWithChildren<
    ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger'; loading?: boolean }
  >,
) {
  const { variant = 'primary', loading, className = '', disabled, children, ...rest } = props;
  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  };

  return (
    <button
      {...rest}
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
    >
      {loading ? '處理中…' : children}
    </button>
  );
}
