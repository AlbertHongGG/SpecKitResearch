'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';

export function CreateCategoryDialog({
  open,
  onClose,
  onCreate,
  creating,
}: {
  open: boolean;
  onClose: () => void;
  creating?: boolean;
  onCreate: (input: { name: string; type: 'income' | 'expense' | 'both' }) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'both'>('both');

  function close() {
    setName('');
    setType('both');
    onClose();
  }

  return (
    <Modal open={open} title="新增類別" onClose={close}>
      <div className="grid gap-3">
        <div>
          <Label htmlFor="cat-name">名稱</Label>
          <Input id="cat-name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="cat-type">類型</Label>
          <Select id="cat-type" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="both">皆可</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => onCreate({ name: name.trim(), type })}
            disabled={creating || !name.trim()}
          >
            {creating ? '新增中…' : '新增'}
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            取消
          </Button>
        </div>
      </div>
    </Modal>
  );
}
