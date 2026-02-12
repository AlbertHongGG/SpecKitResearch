import { forwardRef, type InputHTMLAttributes } from 'react';

type TextFieldProps = {
  id: string;
  label: string;
  error?: string | null;
  hint?: string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(props, ref) {
  const { label, error, hint, ...inputProps } = props;
  const errorId = `${props.id}-error`;
  const hintId = `${props.id}-hint`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      <input
        {...inputProps}
        ref={ref}
        id={props.id}
        className={`mt-1 w-full rounded border px-3 py-2 text-sm ${
          error ? 'border-rose-300' : 'border-slate-300'
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
});
