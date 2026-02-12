'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { isApiError } from '../../services/api-client';
import { register } from '../../services/auth';

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">註冊</h1>
        <p className="mt-1 text-sm text-gray-600">建立新帳號（不會自動登入）。</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await register({ email, password });
            router.push('/login');
          } catch (err) {
            if (isApiError(err)) {
              setError(err.message);
            } else {
              setError('註冊失敗，請稍後再試');
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="密碼（至少 8 碼）"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? '建立中…' : '建立帳號'}
        </Button>
      </form>

      <div className="text-sm text-gray-600">
        已經有帳號？
        <a className="ml-1 text-blue-600 hover:underline" href="/login">
          登入
        </a>
      </div>
    </div>
  );
}
