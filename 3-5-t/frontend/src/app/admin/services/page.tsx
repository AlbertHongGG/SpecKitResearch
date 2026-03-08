'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiFetch } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

const Schema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  upstreamUrl: z.string().url(),
});
type Form = z.infer<typeof Schema>;

export default function AdminServicesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-services'], queryFn: () => apiFetch<any>('/admin/services') });
  const form = useForm<Form>({ resolver: zodResolver(Schema), defaultValues: { slug: '', name: '', upstreamUrl: '' } });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Services</h1>
      <form
        className="grid gap-2 rounded border p-4"
        onSubmit={form.handleSubmit(async (v) => {
          await apiFetch('/admin/services', { method: 'POST', body: JSON.stringify(v) });
          await qc.invalidateQueries({ queryKey: ['admin-services'] });
          form.reset();
        })}
      >
        <Input aria-label="Service slug" placeholder="slug" {...form.register('slug')} />
        <Input aria-label="Service name" placeholder="name" {...form.register('name')} />
        <Input aria-label="Upstream URL" placeholder="upstreamUrl" {...form.register('upstreamUrl')} />
        <Button type="submit">Create</Button>
      </form>
      <div className="rounded border">
        {data?.items?.map((s: any) => (
          <div key={s.id} className="border-b p-3 text-sm">
            <div className="font-medium">{s.slug} — {s.name}</div>
            <div className="text-xs text-gray-600">{s.upstreamUrl} ({s.status})</div>
          </div>
        ))}
      </div>
    </div>
  );
}
