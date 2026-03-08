import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminGetSystemSettings, adminUpdateSystemSettings } from '../../api/admin';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';

export function SystemSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'system-settings'], queryFn: () => adminGetSystemSettings() });
  const form = useForm({
    defaultValues: {
      allowed_currencies: 'TWD,USD,JPY',
      default_return_method: 'query_string' as 'query_string' | 'post_form',
      session_idle_sec: 28800,
      session_absolute_sec: 604800,
      webhook_secret_grace_sec_default: 604800,
    },
  });

  useEffect(() => {
    if (!q.data) return;
    form.reset({
      allowed_currencies: q.data.allowed_currencies.join(','),
      default_return_method: q.data.default_return_method,
      session_idle_sec: q.data.session_idle_sec,
      session_absolute_sec: q.data.session_absolute_sec,
      webhook_secret_grace_sec_default: q.data.webhook_secret_grace_sec_default,
    });
  }, [q.data, form]);

  const save = useMutation({
    mutationFn: (v: any) =>
      adminUpdateSystemSettings({
        allowed_currencies: String(v.allowed_currencies)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        default_return_method: v.default_return_method,
        session_idle_sec: Number(v.session_idle_sec),
        session_absolute_sec: Number(v.session_absolute_sec),
        webhook_secret_grace_sec_default: Number(v.webhook_secret_grace_sec_default),
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'system-settings'] });
    },
  });

  if (q.isLoading) return <Spinner />;
  if (q.isError)
    return (
      <Alert kind="error" title="Failed to load">
        {(q.error as any)?.message}
      </Alert>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">System settings</h1>

      {save.isError ? (
        <Alert kind="error" title="Save failed">
          {(save.error as any)?.message}
        </Alert>
      ) : null}

      <form className="space-y-3 rounded-lg border bg-white p-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <Input label="Allowed currencies (comma-separated)" {...form.register('allowed_currencies')} />
        <label className="block">
          <div className="mb-1 text-sm font-medium text-slate-700">Default return method</div>
          <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" {...form.register('default_return_method')}>
            <option value="query_string">query_string</option>
            <option value="post_form">post_form</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Session idle sec" type="number" {...form.register('session_idle_sec', { valueAsNumber: true })} />
          <Input label="Session absolute sec" type="number" {...form.register('session_absolute_sec', { valueAsNumber: true })} />
        </div>
        <Input
          label="Webhook secret grace sec default"
          type="number"
          {...form.register('webhook_secret_grace_sec_default', { valueAsNumber: true })}
        />

        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </div>
  );
}
