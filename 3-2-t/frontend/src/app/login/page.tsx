'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { useSession } from '@/lib/auth/session-context';
import { login } from '@/services/auth/auth-api';

export default function Page() {
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState('org-admin@example.com');
  const [password, setPassword] = useState('org-admin-password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/orgs');

  useEffect(() => {
    const nextReturnUrl = new URLSearchParams(window.location.search).get('returnUrl') ?? '/orgs';
    setReturnUrl(nextReturnUrl);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      await session.refresh();
      window.location.href = returnUrl;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : typeof caught === 'object' && caught !== null && 'message' in caught
            ? String(caught.message)
            : 'Unable to sign in.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel form-panel">
      <div>
        <p className="eyebrow">Secure multi-tenant access</p>
        <h2>Sign in</h2>
      </div>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        {error ? <p className="error-text">{error}</p> : null}
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
