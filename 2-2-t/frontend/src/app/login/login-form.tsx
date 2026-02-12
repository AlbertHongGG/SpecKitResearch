'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { isApiError } from '../../services/api-client';
import { login } from '../../services/auth';

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();

  const redirectTo = useMemo(() => sp?.get('redirect') || '/my-courses', [sp]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">登入</h1>
        <p className="mt-1 text-sm text-gray-600">使用 Email 與密碼登入。</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await login({ email, password });
            router.push(redirectTo);
          } catch (err) {
            if (isApiError(err)) {
              if (err.code === 'USER_DISABLED') setError('帳號已停用，請聯絡管理員');
              else setError(err.message);
            } else {
              setError('登入失敗，請稍後再試');
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="密碼" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? '登入中…' : '登入'}
        </Button>
      </form>

      <div className="text-sm text-gray-600">
        還沒有帳號？
        <a className="ml-1 text-blue-600 hover:underline" href="/register">
          註冊
        </a>
      </div>
    </div>
  );
}
