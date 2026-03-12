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
  minuteLimit: z.number().int().positive().nullable().optional(),
  hourLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  scopeIds: z.array(z.string()).default([]),
});

type FormInput = z.input<typeof Schema>;
type FormOutput = z.output<typeof Schema>;

export function EditKeyForm({
  keyItem,
  onDone,
}: {
  keyItem: any;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const scopesQuery = useQuery({ queryKey: ['scopes'], queryFn: () => apiFetch<{ scopes: any[] }>('/scopes') });

  const form = useForm<FormInput, any, FormOutput>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: keyItem.name,
      minuteLimit: keyItem.minuteLimit ?? null,
      hourLimit: keyItem.hourLimit ?? null,
      expiresAt: keyItem.expiresAt ?? null,
      scopeIds: [],
    },
  });

  const activeScopes = scopesQuery.data?.scopes ?? [];
  const selectedScopeKeys = new Set<string>(keyItem.scopeKeys ?? []);
  const selectedIds = form.watch('scopeIds') ?? [];

  return (
    <div className="space-y-3">
      {error ? <Alert title="更新失敗">{error}</Alert> : null}
      <div>
        <label className="text-sm">Name</label>
        <Input {...form.register('name')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm">Minute limit（空白=不覆蓋）</label>
          <Input
            type="number"
            placeholder=""
            {...form.register('minuteLimit', {
              setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
            })}
          />
        </div>
        <div>
          <label className="text-sm">Hour limit（空白=不覆蓋）</label>
          <Input
            type="number"
            placeholder=""
            {...form.register('hourLimit', {
              setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
            })}
          />
        </div>
      </div>
      <div>
        <label className="text-sm">Expires at（ISO datetime；空白=不過期）</label>
        <Input placeholder="2026-03-05T12:00:00.000Z" {...form.register('expiresAt')} />
      </div>
      <div>
        <div className="text-sm font-medium">Scopes</div>
        <div className="mt-2 grid gap-1">
          {activeScopes.map((s) => {
            const checkedByKey = selectedScopeKeys.has(s.key);
            const checked = selectedIds.includes(s.id) || checkedByKey;
            return (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={checkedByKey}
                  onChange={(e) => {
                    const next = new Set(form.getValues('scopeIds'));
                    if (e.target.checked) next.add(s.id);
                    else next.delete(s.id);
                    form.setValue('scopeIds', Array.from(next));
                  }}
                />
                <span className="font-mono">{s.key}</span>
                <span className="text-xs text-gray-600">{s.description}</span>
              </label>
            );
          })}
          {activeScopes.length === 0 ? <div className="text-sm text-gray-600">No scopes</div> : null}
        </div>
      </div>

      <Button
        type="button"
        disabled={form.formState.isSubmitting}
        onClick={form.handleSubmit(async (v) => {
          setError(null);
          try {
            const pickedIds = v.scopeIds.length ? v.scopeIds : undefined;
            let scopeKeys: string[] | undefined = undefined;
            if (pickedIds) {
              scopeKeys = activeScopes.filter((s) => pickedIds.includes(s.id)).map((s) => s.key);
            }
            await apiFetch(`/keys/${keyItem.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name: v.name,
                minuteLimit: v.minuteLimit ?? null,
                hourLimit: v.hourLimit ?? null,
                expiresAt: v.expiresAt ? v.expiresAt : null,
                scopeKeys,
              }),
            });
            await qc.invalidateQueries({ queryKey: ['keys'] });
            onDone();
          } catch (e: any) {
            setError(e?.message ?? 'Unknown error');
          }
        })}
      >
        Save
      </Button>
    </div>
  );
}
