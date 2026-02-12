'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { loginSchema } from '@/lib/shared/schemas/auth';

type FormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/transactions';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(loginSchema) });

  const [error, setError] = useState<string | null>(null);

  async function onSubmit(values: FormValues) {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(values),
      headers: { 'content-type': 'application/json' },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? '登入失敗');
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h1 className="text-lg font-semibold">登入</h1>
      <p className="mt-1 text-sm text-neutral-600">使用 Email 與密碼登入你的帳號。</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{error}</Alert> : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>

        <div>
          <Label htmlFor="password">密碼</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '登入中…' : '登入'}
        </Button>

        <p className="text-sm text-neutral-700">
          還沒有帳號？ <Link href="/register">註冊</Link>
        </p>
      </form>
    </div>
  );
}

import { useState } from 'react';
