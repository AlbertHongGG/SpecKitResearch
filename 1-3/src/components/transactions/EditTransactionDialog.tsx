'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import type { CategoryDto } from '@/lib/shared/hooks/useCategories';

export type EditableTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  date: string;
  note?: string;
};

export function EditTransactionDialog({
  open,
  transaction,
  categories,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  transaction: EditableTransaction | null;
  categories: CategoryDto[];
  saving?: boolean;
  onClose: () => void;
  onSave: (patch: { type: 'income' | 'expense'; amount: number; categoryId: string; date: string; note?: string }) => void;
}) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);

  useEffect(() => {
    if (!open || !transaction) return;
    setType(transaction.type);
    setAmount(transaction.amount);
    setCategoryId(transaction.categoryId);
    setDate(transaction.date);
    setNote(transaction.note ?? '');
  }, [open, transaction]);

  return (
    <Modal open={open} title="編輯帳務" onClose={onClose}>
      <div className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label htmlFor="edit-type">類型</Label>
            <Select id="edit-type" value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-amount">金額</Label>
            <Input id="edit-amount" type="number" min={1} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="edit-category">類別</Label>
            <Select id="edit-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">請選擇</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-date">日期</Label>
            <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label htmlFor="edit-note">備註</Label>
          <Input id="edit-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() =>
              onSave({
                type,
                amount,
                categoryId,
                date,
                note: note ? note : undefined,
              })
            }
            disabled={saving || !categoryId || !date || !Number.isFinite(amount) || amount <= 0}
          >
            {saving ? '儲存中…' : '儲存'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
}
