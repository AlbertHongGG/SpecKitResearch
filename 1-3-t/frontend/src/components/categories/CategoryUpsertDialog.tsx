import { useMemo, useState } from 'react';

import type { Category, CategoryType } from '../../services/categories';

function typeLabel(type: CategoryType) {
  if (type === 'income') return '收入';
  if (type === 'expense') return '支出';
  return '兩者皆可';
}

export function CategoryUpsertDialog(props: {
  open: boolean;
  mode: 'create' | 'edit';
  category?: Category | null;
  onClose: () => void;
  onSubmit: (input: { name: string; type: CategoryType }) => Promise<void>;
  submitting?: boolean;
}) {
  const initialName = props.mode === 'edit' ? props.category?.name ?? '' : '';
  const initialType = props.mode === 'edit' ? props.category?.type ?? 'expense' : 'expense';

  const [name, setName] = useState(initialName);
  const [type, setType] = useState<CategoryType>(initialType);
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const next: Record<string, string | null> = { name: null };
    const trimmed = name.trim();
    if (!trimmed) next.name = '請輸入類別名稱';
    if (trimmed.length > 20) next.name = '類別名稱最多 20 字';
    return next;
  }, [name]);

  if (!props.open) return null;

  async function submit() {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;

    await props.onSubmit({ name: name.trim(), type });
    props.onClose();
    setTouched(false);

    if (props.mode === 'create') {
      setName('');
      setType('expense');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={props.mode === 'create' ? '新增類別' : '編輯類別'}
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {props.mode === 'create' ? '新增類別' : '編輯類別'}
          </h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            onClick={props.onClose}
            disabled={props.submitting}
          >
            關閉
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="categoryName" className="block text-sm font-medium text-slate-800">
              名稱
            </label>
            <input
              id="categoryName"
              type="text"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="例如：娛樂"
              maxLength={20}
              autoFocus
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">{name.trim().length}/20</span>
              {touched && errors.name ? <span className="text-xs text-red-700">{errors.name}</span> : null}
            </div>
          </div>

          <div>
            <label htmlFor="categoryType" className="block text-sm font-medium text-slate-800">
              類型
            </label>
            <select
              id="categoryType"
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
            >
              <option value="expense">{typeLabel('expense')}</option>
              <option value="income">{typeLabel('income')}</option>
              <option value="both">{typeLabel('both')}</option>
            </select>
          </div>

          {props.mode === 'edit' && props.category?.isDefault ? (
            <p className="text-xs text-slate-600">此為預設類別。</p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t px-5 py-4">
          <button
            type="button"
            className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={props.onClose}
            disabled={props.submitting}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            onClick={submit}
            disabled={props.submitting}
          >
            {props.mode === 'create' ? '新增' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}
