import type { InputHTMLAttributes } from 'react';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      className={
        'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 ' +
        className
      }
      {...props}
    />
  );
}
