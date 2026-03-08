'use client';

import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded border px-3 py-2 outline-none focus:ring ${className}`}
    />
  );
}
