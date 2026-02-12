import * as React from 'react';

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <div className="text-base font-semibold">{title}</div>
      {description ? <div className="mt-1 text-sm text-gray-600">{description}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
