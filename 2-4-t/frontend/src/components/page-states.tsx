import React from 'react';

export function PageLoading({ title = 'Loading…' }: { title?: string }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}

export function PageEmpty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="text-lg font-semibold">{title}</div>
      {detail ? <div className="mt-2 text-sm text-gray-600">{detail}</div> : null}
    </div>
  );
}

export function PageError({
  title,
  detail,
  actions
}: {
  title: string;
  detail?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="text-lg font-semibold text-red-700">{title}</div>
      {detail ? <div className="mt-2 text-sm text-red-800">{detail}</div> : null}
      {actions ? <div className="mt-3">{actions}</div> : null}
    </div>
  );
}

