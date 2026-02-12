'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '../../services/auth';
import { Button } from '../ui/button';
import { isApiError } from '../../services/api-client';

export function HeaderAuth({ user }: { user: { email: string; role: string } }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-xs text-gray-600 sm:block">
        {user.email}（{user.role}）
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={submitting}
        onClick={async () => {
          setSubmitting(true);
          try {
            await logout();
            router.push('/');
            router.refresh();
          } catch (err) {
            // If session already invalid, treat as logged out.
            if (isApiError(err) && err.status === 401) {
              router.push('/');
              router.refresh();
              return;
            }
            throw err;
          } finally {
            setSubmitting(false);
          }
        }}
      >
        登出
      </Button>
    </div>
  );
}
