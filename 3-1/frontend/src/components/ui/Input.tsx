import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  description?: string;
  error?: string;
};

export function Input({ label, description, error, id, className = '', ...props }: Props) {
  const inputId = id ?? props.name ?? undefined;
  const baseId = inputId ?? undefined;
  const descId = description && baseId ? `${baseId}__desc` : undefined;
  const errId = error && baseId ? `${baseId}__err` : undefined;

  const describedBy = [descId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-neutral-800">
          {label}
        </span>
      ) : null}
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        aria-errormessage={errId}
        className={[
          'w-full rounded border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200',
          error ? 'border-red-500' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />

      {description && descId ? (
        <span id={descId} className="mt-1 block text-sm text-neutral-600">
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={errId} className="mt-1 block text-sm text-red-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
