import { useMemo } from 'react';

import type { Category } from '../../services/categories';
import type { TransactionType } from '../../services/transactions';

function isCompatible(categoryType: Category['type'], txType: TransactionType) {
  if (categoryType === 'both') return true;
  return categoryType === txType;
}

export function CategorySelect(props: {
  id: string;
  label: string;
  categories: Category[];
  transactionType: TransactionType;
  value: string;
  onChange: (next: string) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const options = useMemo(() => {
    return props.categories
      .filter((c) => c.isActive)
      .filter((c) => isCompatible(c.type, props.transactionType));
  }, [props.categories, props.transactionType]);

  return (
    <div>
      <label htmlFor={props.id} className="block text-sm font-medium text-slate-800">
        {props.label}
      </label>
      <select
        id={props.id}
        className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
      >
        <option value="" disabled>
          請選擇
        </option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {props.error ? <p className="mt-1 text-xs text-red-700">{props.error}</p> : null}
    </div>
  );
}
