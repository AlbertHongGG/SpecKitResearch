'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import type { CategoryDto } from '@/lib/shared/hooks/useCategories';

export function EditCategoryDialog({
  open,
  category,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  category: CategoryDto | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (patch: { name?: string; type?: 'income' | 'expense' | 'both' }) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'both'>('both');

  useEffect(() => {
    if (!open || !category) return;
    setName(category.name);
    setType(category.type);
  }, [open, category]);

  return (
    <Modal open={open} title="編輯類別" onClose={onClose}>
      <div className="grid gap-3">
        <div>
          <Label htmlFor="edit-cat-name">名稱</Label>
          <Input id="edit-cat-name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-cat-type">類型</Label>
          <Select id="edit-cat-type" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="both">皆可</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => onSave({ name: name.trim(), type })}
            disabled={saving || !name.trim()}
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
