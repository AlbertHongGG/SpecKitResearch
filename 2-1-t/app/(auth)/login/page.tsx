'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import { Button } from '../../../src/ui/components/Button';
import { Input } from '../../../src/ui/components/Input';
import { apiFetch } from '../../../src/ui/lib/apiClient';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      router.push(next && next.startsWith('/') ? next : '/courses');
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '登入失敗');
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">登入</h1>

      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="text-sm">Email</label>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <Input type="password" autoComplete="current-password" {...form.register('password')} />
        </div>
        {serverError ? <div className="text-sm text-red-700">{serverError}</div> : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          登入
        </Button>
      </form>
    </main>
  );
}
