import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  const { className = '', ...rest } = props;
  return (
    <select
      ref={ref}
      {...rest}
      className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
    />
  );
});
