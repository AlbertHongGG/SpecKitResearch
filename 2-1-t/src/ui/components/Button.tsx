'use client';

import clsx from 'clsx';

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'danger';
  },
) {
  const { className, variant = 'primary', ...rest } = props;
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center rounded px-3 py-2 text-sm font-medium disabled:opacity-50',
        variant === 'primary' && 'bg-slate-900 text-white hover:bg-slate-800',
        variant === 'secondary' && 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500',
        className,
      )}
    />
  );
}
