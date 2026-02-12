import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = '', children, ...props }: Props) {
  return (
    <select
      className={`w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
