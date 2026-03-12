'use client';

import { formatApiError } from '@/lib/api/errors';

export function InlineLoading({ label = 'Loading…' }: { label?: string }) {
  return <div className="text-sm text-slate-600">{label}</div>;
}

export function InlineEmpty({ label = 'Empty' }: { label?: string }) {
  return <div className="text-sm text-slate-400">{label}</div>;
}

export function InlineError({ error }: { error: unknown }) {
  return <div className="text-sm text-red-700">{formatApiError(error)}</div>;
}
