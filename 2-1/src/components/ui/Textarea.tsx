import type { TextareaHTMLAttributes } from 'react';

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) {
  return (
    <textarea
      className={
        'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 ' +
        className
      }
      {...props}
    />
  );
}
