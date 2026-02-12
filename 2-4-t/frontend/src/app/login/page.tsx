import { Suspense } from 'react';
import { LoginClient } from './login-client';

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm">Loading…</div>}>
      <LoginClient />
    </Suspense>
  );
}
