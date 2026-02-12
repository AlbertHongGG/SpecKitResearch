import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { login } from '../services/auth';
import { toUserFacingMessage } from '../services/apiErrors';
import { TextField } from '../components/forms';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);

    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = '請輸入 Email';
    }
    if (password.length < 8) {
      nextErrors.password = '密碼至少 8 字元';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.email) emailRef.current?.focus();
      else if (nextErrors.password) passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({ email: email.trim(), password });
      queryClient.setQueryData(['session'], { authenticated: true, user: res.user });
      navigate('/transactions', { replace: true });
    } catch (err) {
      setFormError(toUserFacingMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold">登入</h1>
      <p className="mt-1 text-sm text-slate-600">
        還沒有帳號？{' '}
        <Link className="text-sky-700 hover:underline" to="/register">
          註冊
        </Link>
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <TextField
          id="loginEmail"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          ref={emailRef}
        />

        <TextField
          id="loginPassword"
          label="密碼"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          ref={passwordRef}
        />

        {formError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <button
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? '登入中…' : '登入'}
        </button>
      </form>
    </div>
  );
}
