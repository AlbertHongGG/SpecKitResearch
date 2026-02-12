import type { ReactNode } from 'react';
import { ApiError } from '../../api/errors';

export function ErrorState(props: {
  error?: unknown;
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  const title = props.title ?? '發生錯誤';

  if (props.error instanceof ApiError) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <div className="font-medium">{title}</div>
        <div className="mt-1">{props.error.message}</div>
        <div className="mt-1 text-red-700">({props.error.code})</div>
        {props.action ? <div className="mt-2">{props.action}</div> : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
      <div className="font-medium">{title}</div>
      <div className="mt-1">{props.message ?? '請稍後再試。'}</div>
      {props.action ? <div className="mt-2">{props.action}</div> : null}
    </div>
  );
}
