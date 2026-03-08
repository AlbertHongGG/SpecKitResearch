'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const Schema = z.object({ endpointId: z.string().min(1), scopeId: z.string().min(1) });
type Form = z.infer<typeof Schema>;

export default function AdminScopeRulesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-scope-rules'], queryFn: () => apiFetch<any>('/admin/scope-rules') });
  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { endpointId: '', scopeId: '' } });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Scope rules</h1>
      <form
        className="grid gap-2 rounded border p-4"
        onSubmit={form.handleSubmit(async (v) => {
          await apiFetch('/admin/scope-rules', { method: 'POST', body: JSON.stringify(v) });
          await qc.invalidateQueries({ queryKey: ['admin-scope-rules'] });
          form.reset();
        })}
      >
        <Input aria-label="Endpoint ID" placeholder="endpointId" {...form.register('endpointId')} />
        <Input aria-label="Scope ID" placeholder="scopeId" {...form.register('scopeId')} />
        <Button type="submit">Add</Button>
      </form>
      <div className="rounded border">
        {data?.items?.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between border-b p-3 text-sm">
            <div>
              endpoint={r.endpointId} scope={r.scopeKey}
            </div>
            <button
              className="rounded border px-3 py-1"
              onClick={async () => {
                await apiFetch(`/admin/scope-rules?endpointId=${encodeURIComponent(r.endpointId)}&scopeId=${encodeURIComponent(r.scopeId)}`, { method: 'DELETE' });
                await qc.invalidateQueries({ queryKey: ['admin-scope-rules'] });
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
