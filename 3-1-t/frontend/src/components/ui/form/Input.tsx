import { forwardRef, InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-1 text-sm" htmlFor={inputId}>
      <span className="font-medium">{label}</span>
      <input
        id={inputId}
        ref={ref}
        className="w-full rounded-md border border-black/20 px-3 py-2 outline-none focus:border-black"
        {...props}
      />
    </label>
  );
});
