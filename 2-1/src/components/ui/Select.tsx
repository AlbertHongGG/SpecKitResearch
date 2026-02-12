import type { SelectHTMLAttributes } from 'react';

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { className?: string }) {
  return (
    <select
      className={
        'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 ' +
        className
      }
      {...props}
    />
  );
}
