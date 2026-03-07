import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function Button({ children, loading = false, disabled, className, ...props }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${className ?? ''}`}
      {...props}
    >
      {loading ? 'Submitting...' : children}
    </button>
  );
}
