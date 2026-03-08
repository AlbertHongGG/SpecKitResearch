'use client';

import * as React from 'react';

export function AsyncState(props: {
  isLoading: boolean;
  error: unknown;
  isEmpty?: boolean;
  empty?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (props.isLoading) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Loading…</div>;
  }

  if (props.error) {
    const message = props.error instanceof Error ? props.error.message : String(props.error);
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</div>;
  }

  if (props.isEmpty) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
        {props.empty ?? 'Nothing to show.'}
      </div>
    );
  }

  return <>{props.children}</>;
}
