import * as React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
};

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-black text-white hover:bg-black/90',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent hover:bg-gray-100',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
};

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={
        [
          'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
          'disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          className,
        ]
          .filter(Boolean)
          .join(' ')
      }
      {...props}
    />
  );
}
