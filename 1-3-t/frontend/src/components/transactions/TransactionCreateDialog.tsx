import { useMemo, useState } from 'react';

import type { Category } from '../../services/categories';
import type { TransactionType } from '../../services/transactions';
import { CategorySelect } from './CategorySelect';

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseAmount(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function TransactionCreateDialog(props: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmit: (input: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    date: string;
    note?: string;
  }) => Promise<void>;
  submitting?: boolean;
}) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIsoDate());
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);

  const errors = useMemo(() => {
    const next: Record<string, string | null> = {
      amount: null,
      categoryId: null,
      date: null,
      note: null,
    };

    const amt = parseAmount(amount);
    if (!Number.isInteger(amt) || amt <= 0) next.amount = '金額需為正整數';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = '日期格式不正確';

    if (!categoryId) next.categoryId = '請選擇類別';

    if (note.length > 200) next.note = '備註最多 200 字';

    return next;
  }, [amount, categoryId, date, note]);

  if (!props.open) return null;

  async function submit() {
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;

    await props.onSubmit({
      type,
      amount: parseAmount(amount),
      categoryId,
      date,
      note: note ? note : undefined,
    });

    props.onClose();
    setTouched(false);
    setAmount('');
    setCategoryId('');
    setNote('');
    setDate(todayIsoDate());
    setType('expense');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="新增帳務"
    >
      <div className="w-full max-w-lg rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">新增帳務</h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            onClick={props.onClose}
          >
            關閉
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">類型</legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="txType"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={() => setType('expense')}
                />
                支出
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="txType"
                  value="income"
                  checked={type === 'income'}
                  onChange={() => setType('income')}
                />
                收入
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="txAmount" className="block text-sm font-medium text-slate-800">
              金額
            </label>
            <input
              id="txAmount"
              type="number"
              inputMode="numeric"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="例如：120"
            />
            {touched && errors.amount ? <p className="mt-1 text-xs text-red-700">{errors.amount}</p> : null}
          </div>

          <div>
            <label htmlFor="txDate" className="block text-sm font-medium text-slate-800">
              日期
            </label>
            <input
              id="txDate"
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={() => setTouched(true)}
            />
            {touched && errors.date ? <p className="mt-1 text-xs text-red-700">{errors.date}</p> : null}
          </div>

          <CategorySelect
            id="txCategory"
            label="類別"
            categories={props.categories}
            transactionType={type}
            value={categoryId}
            onChange={(v) => {
              setCategoryId(v);
              setTouched(true);
            }}
            disabled={props.categories.length === 0}
            error={touched ? errors.categoryId : null}
          />

          <div>
            <label htmlFor="txNote" className="block text-sm font-medium text-slate-800">
              備註（可選）
            </label>
            <textarea
              id="txNote"
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="例如：午餐"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-500">{note.length}/200</span>
              {touched && errors.note ? <span className="text-xs text-red-700">{errors.note}</span> : null}
            </div>
          </div>
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
            新增
          </button>
        </div>
      </div>
    </div>
  );
}
