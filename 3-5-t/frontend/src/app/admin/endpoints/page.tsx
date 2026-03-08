'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const Schema = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']),
  pathPattern: z.string().min(1),
});
type Form = z.infer<typeof Schema>;

export default function AdminEndpointsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-endpoints'], queryFn: () => apiFetch<any>('/admin/endpoints') });
  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { serviceId: '', name: '', method: 'GET', pathPattern: '' },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Endpoints</h1>
      <form
        className="grid gap-2 rounded border p-4"
        onSubmit={form.handleSubmit(async (v) => {
          await apiFetch('/admin/endpoints', { method: 'POST', body: JSON.stringify(v) });
          await qc.invalidateQueries({ queryKey: ['admin-endpoints'] });
          form.reset();
        })}
      >
        <Input aria-label="Service ID" placeholder="serviceId" {...form.register('serviceId')} />
        <Input aria-label="Endpoint name" placeholder="name" {...form.register('name')} />
        <Input aria-label="HTTP method" placeholder="method (GET)" {...form.register('method')} />
        <Input aria-label="Path pattern" placeholder="/hello" {...form.register('pathPattern')} />
        <Button type="submit">Create</Button>
      </form>
      <div className="rounded border">
        {data?.items?.map((e: any) => (
          <div key={e.id} className="border-b p-3 text-sm">
            <div className="font-medium">{e.method} {e.pathPattern} — {e.name}</div>
            <div className="text-xs text-gray-600">serviceId={e.serviceId} ({e.status})</div>
          </div>
        ))}
      </div>
    </div>
  );
}
