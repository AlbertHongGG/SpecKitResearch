import type { TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  props,
  ref,
) {
  const { className = '', ...rest } = props;
  return (
    <textarea
      ref={ref}
      {...rest}
      className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${className}`}
    />
  );
});
