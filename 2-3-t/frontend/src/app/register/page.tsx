'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { apiFetch } from '../../lib/api';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(12, '至少 12 字元'),
});
type Form = z.infer<typeof Schema>;

export default function RegisterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/keys';
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Form>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <div className="mx-auto max-w-md rounded border p-6">
      <h1 className="text-lg font-semibold">Register</h1>
      {error ? <div className="mt-3"><Alert title="註冊失敗">{error}</Alert></div> : null}

      <form
        className="mt-4 space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            await apiFetch('/register', { method: 'POST', body: JSON.stringify(values) });
            router.push(`/login?next=${encodeURIComponent(next)}`);
          } catch (e: any) {
            setError(e?.message ?? 'Unknown error');
          }
        })}
      >
        <div>
          <label className="text-sm">Email</label>
          <Input type="email" {...form.register('email')} />
          {form.formState.errors.email ? (
            <div className="mt-1 text-xs text-red-600">{form.formState.errors.email.message}</div>
          ) : null}
        </div>
        <div>
          <label className="text-sm">Password</label>
          <Input type="password" {...form.register('password')} />
          {form.formState.errors.password ? (
            <div className="mt-1 text-xs text-red-600">{form.formState.errors.password.message}</div>
          ) : null}
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </div>
  );
}
