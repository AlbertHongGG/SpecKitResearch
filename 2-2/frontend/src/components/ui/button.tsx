import { ButtonHTMLAttributes } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50 ${className}`}
    />
  );
}
