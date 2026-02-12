import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { logout } from '../services/auth';

export function LogoutButton() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  async function onClick() {
    setSubmitting(true);
    try {
      await logout();
    } finally {
      queryClient.setQueryData(['session'], { authenticated: false });
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      onClick={onClick}
      disabled={submitting}
    >
      {submitting ? '登出中…' : '登出'}
    </button>
  );
}
