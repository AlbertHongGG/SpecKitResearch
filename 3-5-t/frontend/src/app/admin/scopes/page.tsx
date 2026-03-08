'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const Schema = z.object({
  key: z.string().min(1),
  description: z.string().min(1),
});
type Form = z.infer<typeof Schema>;

export default function AdminScopesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-scopes'], queryFn: () => apiFetch<any>('/admin/scopes') });
  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { key: '', description: '' } });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Scopes</h1>
      <form
        className="grid gap-2 rounded border p-4"
        onSubmit={form.handleSubmit(async (v) => {
          await apiFetch('/admin/scopes', { method: 'POST', body: JSON.stringify(v) });
          await qc.invalidateQueries({ queryKey: ['admin-scopes'] });
          form.reset();
        })}
      >
        <Input aria-label="Scope key" placeholder="demo.read" {...form.register('key')} />
        <Input aria-label="Scope description" placeholder="description" {...form.register('description')} />
        <Button type="submit">Create</Button>
      </form>
      <div className="rounded border">
        {data?.items?.map((s: any) => (
          <div key={s.id} className="border-b p-3 text-sm">
            <div className="font-medium">{s.key}</div>
            <div className="text-xs text-gray-600">{s.description} ({s.status})</div>
          </div>
        ))}
      </div>
    </div>
  );
}
