import { InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, className = "", id, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-1 block text-sm font-medium text-gray-900">
          {label}
        </span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-black ${className}`}
        {...props}
      />
      {error ? (
        <span className="mt-1 block text-sm text-red-600">{error}</span>
      ) : null}
    </label>
  );
});
