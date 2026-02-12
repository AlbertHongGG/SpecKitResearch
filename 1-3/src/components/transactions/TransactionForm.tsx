'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { createTransactionSchema } from '@/lib/shared/schemas/transaction';
import { useCategories } from '@/lib/shared/hooks/useCategories';
import { useCreateTransaction } from '@/lib/shared/hooks/useCreateTransaction';

type FormValues = z.infer<typeof createTransactionSchema>;

export function TransactionForm({ onCreated }: { onCreated?: () => void }) {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createTx = useCreateTransaction();

  const activeCategories = useMemo(
    () => (categories ?? []).filter((c) => c.isActive),
    [categories],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      type: 'expense',
      date: new Date().toISOString().slice(0, 10),
    },
  });

  async function onSubmit(values: FormValues) {
    await createTx.mutateAsync({
      type: values.type,
      amount: Number(values.amount),
      categoryId: values.categoryId,
      date: values.date,
      note: values.note,
    });

    reset({
      type: 'expense',
      amount: undefined as any,
      categoryId: undefined as any,
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
    onCreated?.();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      {createTx.error ? (
        <Alert className="border-red-200 bg-red-50 text-red-700">{(createTx.error as any).message ?? '新增失敗'}</Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="type">類型</Label>
          <Select id="type" {...register('type')}>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">金額</Label>
          <Input
            id="amount"
            type="number"
            min={1}
            step={1}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount ? (
            <p id="amount-error" className="mt-1 text-sm text-red-600">
              {errors.amount.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="categoryId">類別</Label>
          <Select
            id="categoryId"
            disabled={categoriesLoading}
            aria-invalid={!!errors.categoryId}
            aria-describedby={errors.categoryId ? 'categoryId-error' : undefined}
            {...register('categoryId')}
          >
            <option value="">請選擇</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {errors.categoryId ? (
            <p id="categoryId-error" className="mt-1 text-sm text-red-600">
              {errors.categoryId.message}
            </p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="date">日期</Label>
          <Input
            id="date"
            type="date"
            aria-invalid={!!errors.date}
            aria-describedby={errors.date ? 'date-error' : undefined}
            {...register('date')}
          />
          {errors.date ? (
            <p id="date-error" className="mt-1 text-sm text-red-600">
              {errors.date.message}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <Label htmlFor="note">備註</Label>
        <Input
          id="note"
          type="text"
          maxLength={200}
          aria-invalid={!!errors.note}
          aria-describedby={errors.note ? 'note-error' : undefined}
          {...register('note')}
        />
        {errors.note ? (
          <p id="note-error" className="mt-1 text-sm text-red-600">
            {errors.note.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={createTx.isPending}>
        {createTx.isPending ? '新增中…' : '新增'}
      </Button>
    </form>
  );
}
