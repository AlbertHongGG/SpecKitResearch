import * as React from 'react';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-gray-900">{label}</div> : null}
      <input
        className={
          [
            'w-full rounded-md border px-3 py-2 text-sm',
            error ? 'border-red-500 focus:outline-red-500' : 'border-gray-300 focus:outline-black',
            className,
          ]
            .filter(Boolean)
            .join(' ')
        }
        {...props}
      />
      {error ? <div className="mt-1 text-sm text-red-600">{error}</div> : null}
    </label>
  );
}
