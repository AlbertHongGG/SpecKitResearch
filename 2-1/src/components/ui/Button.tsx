import type { ButtonHTMLAttributes } from 'react';

export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      className={
        'inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 ' +
        className
      }
      {...props}
    />
  );
}
