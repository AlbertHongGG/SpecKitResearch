'use client';

import clsx from 'clsx';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={clsx(
        'w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500',
        className,
      )}
    />
  );
}
