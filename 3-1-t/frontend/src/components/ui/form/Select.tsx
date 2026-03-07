import { forwardRef, SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export const Select = forwardRef<HTMLSelectElement, Props>(function Select(
  { label, id, children, ...props },
  ref,
) {
  const selectId = id ?? props.name;

  return (
    <label className="block space-y-1 text-sm" htmlFor={selectId}>
      <span className="font-medium">{label}</span>
      <select
        id={selectId}
        ref={ref}
        className="w-full rounded-md border border-black/20 bg-white px-3 py-2 outline-none focus:border-black"
        {...props}
      >
        {children}
      </select>
    </label>
  );
});
