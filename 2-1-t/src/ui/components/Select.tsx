'use client';

import clsx from 'clsx';

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <select
      {...rest}
      className={clsx(
        'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500',
        className,
      )}
    />
  );
}
