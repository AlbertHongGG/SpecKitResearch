'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, type ApiError } from '../../services/apiClient';
import { resolver } from '../../lib/forms';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { applyApiErrorToForm } from '../../services/httpErrorHandling';

const schema = z.object({
  email: z.string().email('請輸入正確 email'),
  password: z.string().min(8, '密碼至少 8 碼'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await apiFetch(`/api/auth/login`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      router.replace(next);
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '登入失敗' });
    }
  });

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-xl font-semibold">登入</h1>
      <p className="mt-1 text-sm text-neutral-700">使用 cookie session；登入後會導回原頁面。</p>

      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        {form.formState.errors.root?.message ? (
          <Alert variant="error">{form.formState.errors.root?.message}</Alert>
        ) : null}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          aria-label="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          aria-label="password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '登入中…' : '登入'}
        </Button>
      </form>

      <div className="mt-4 text-sm">
        還沒有帳號？{' '}
        <a className="underline" href="/signup">
          註冊
        </a>
      </div>
    </div>
  );
}
