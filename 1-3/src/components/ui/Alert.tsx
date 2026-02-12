import type { HTMLAttributes } from 'react';

export function Alert({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800 ${className}`}
      {...props}
    />
  );
}
