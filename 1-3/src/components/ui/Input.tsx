import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900 ${className}`}
      {...props}
    />
  );
});
