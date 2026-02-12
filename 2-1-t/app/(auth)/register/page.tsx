'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import { Button } from '../../../src/ui/components/Button';
import { Input } from '../../../src/ui/components/Input';
import { Select } from '../../../src/ui/components/Select';
import { apiFetch } from '../../../src/ui/lib/apiClient';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['student', 'instructor']).default('student'),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', role: 'student' },
  });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      const next = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null;
      router.push(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : '註冊失敗');
    }
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">註冊</h1>

      <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <label className="text-sm">Email</label>
          <Input type="email" autoComplete="email" {...form.register('email')} />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <Input type="password" autoComplete="new-password" {...form.register('password')} />
        </div>
        <div>
          <label className="text-sm">Role</label>
          <Select {...form.register('role')}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </Select>
        </div>
        {serverError ? <div className="text-sm text-red-700">{serverError}</div> : null}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          註冊
        </Button>
      </form>
    </main>
  );
}
