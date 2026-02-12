import type { LabelHTMLAttributes } from 'react';

type Props = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className = '', ...props }: Props) {
  return <label className={`text-sm font-medium text-neutral-900 ${className}`} {...props} />;
}
