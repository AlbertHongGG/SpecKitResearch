import type { PropsWithChildren } from 'react';

export function Badge(props: PropsWithChildren<{ tone?: 'neutral' | 'success' | 'warning' | 'danger' }>) {
  const { tone = 'neutral', children } = props;
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
