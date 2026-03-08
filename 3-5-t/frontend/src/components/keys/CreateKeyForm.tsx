'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';

import { apiFetch } from '../../lib/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';

const Schema = z.object({
  name: z.string().min(1),
  minuteLimit: z.number().int().positive().optional(),
  hourLimit: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
  scopeKeys: z.array(z.string()).default([]),
});
type FormInput = z.input<typeof Schema>;
type FormOutput = z.output<typeof Schema>;

export function CreateKeyForm({ onCreated }: { onCreated: (plainKey: string) => void }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const scopesQuery = useQuery({ queryKey: ['scopes'], queryFn: () => apiFetch<{ scopes: any[] }>('/scopes') });
  const activeScopes = scopesQuery.data?.scopes ?? [];
  const form = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(Schema),
    defaultValues: { name: '', minuteLimit: undefined, hourLimit: undefined, expiresAt: '', scopeKeys: [] },
  });

  return (
    <div className="rounded border p-4">
      <h2 className="font-semibold">Create key</h2>
      {error ? <div className="mt-2"><Alert title="建立失敗">{error}</Alert></div> : null}
      <form
        className="mt-3 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            const res = await apiFetch<{ plainKey: string } & any>('/keys', {
              method: 'POST',
              body: JSON.stringify({
                name: values.name,
                scopeKeys: values.scopeKeys,
                minuteLimit: values.minuteLimit,
                hourLimit: values.hourLimit,
                expiresAt: values.expiresAt ? values.expiresAt : undefined,
              }),
            });
            await qc.invalidateQueries({ queryKey: ['keys'] });
            onCreated(res.plainKey);
            form.reset();
          } catch (e: any) {
            setError(e?.message ?? 'Unknown error');
          }
        })}
      >
        <div>
          <label className="text-sm">Name</label>
          <Input {...form.register('name')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm">Minute limit</label>
            <Input
              type="number"
              {...form.register('minuteLimit', {
                setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
              })}
            />
          </div>
          <div>
            <label className="text-sm">Hour limit</label>
            <Input
              type="number"
              {...form.register('hourLimit', {
                setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
              })}
            />
          </div>
        </div>
        <div>
          <label className="text-sm">Expires at（ISO datetime，可空）</label>
          <Input placeholder="2026-03-05T12:00:00.000Z" {...form.register('expiresAt')} />
        </div>
        <div>
          <div className="text-sm font-medium">Scopes</div>
          <div className="mt-2 grid gap-1">
            {activeScopes.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={s.key}
                  {...form.register('scopeKeys')}
                />
                <span className="font-mono">{s.key}</span>
                <span className="text-xs text-gray-600">{s.description}</span>
              </label>
            ))}
            {activeScopes.length === 0 ? <div className="text-sm text-gray-600">No scopes</div> : null}
          </div>
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Create
        </Button>
      </form>
    </div>
  );
}
