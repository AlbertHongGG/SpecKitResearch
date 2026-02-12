'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { registerSchema } from '@/lib/shared/schemas/auth';

type FormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(registerSchema) });

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(values),
      headers: { 'content-type': 'application/json' },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? '註冊失敗');
      return;
    }

    router.push('/transactions');
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h1 className="text-lg font-semibold">註冊</h1>
      <p className="mt-1 text-sm text-neutral-600">建立新帳號後會自動登入。</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>

        <div>
          <Label htmlFor="password">密碼</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
        </div>

        <div>
          <Label htmlFor="passwordConfirm">確認密碼</Label>
          <Input id="passwordConfirm" type="password" autoComplete="new-password" {...register('passwordConfirm')} />
          {errors.passwordConfirm ? (
            <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '建立中…' : '註冊'}
        </Button>

        <p className="text-sm text-neutral-700">
          已有帳號？ <Link href="/login">登入</Link>
        </p>
      </form>
    </div>
  );
}

import { useState } from 'react';
