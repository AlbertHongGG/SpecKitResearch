'use client';

import { formatApiError } from '@/lib/api/errors';

export function AuthErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {formatApiError(error)}
    </div>
  );
}
