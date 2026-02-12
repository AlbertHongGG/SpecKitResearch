import * as React from 'react';

export function Alert({
  title,
  children,
  variant = 'info',
}: {
  title?: string;
  children?: React.ReactNode;
  variant?: 'info' | 'error' | 'success' | 'warning';
}) {
  const styles: Record<string, string> = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-green-200 bg-green-50 text-green-900',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
  };

  return (
    <div className={['rounded-md border px-4 py-3 text-sm', styles[variant]].join(' ')}>
      {title ? <div className="mb-1 font-medium">{title}</div> : null}
      {children}
    </div>
  );
}
