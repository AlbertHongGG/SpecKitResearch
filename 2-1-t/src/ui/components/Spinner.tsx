'use client';

import clsx from 'clsx';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900',
        className,
      )}
      aria-label="loading"
    />
  );
}
