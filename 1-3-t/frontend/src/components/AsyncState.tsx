import type { ReactNode } from 'react';

export function AsyncState(props: {
  isLoading: boolean;
  error?: string | null;
  onRetry?: (() => void) | null;
  retryLabel?: string;
  isEmpty?: boolean;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (props.isLoading) {
    return (
      <div className="p-6 text-sm text-slate-600" role="status">
        載入中…
      </div>
    );
  }

  if (props.error) {
    return (
      <div className="p-6">
        <div className="text-sm text-red-700" role="alert">
          {props.error}
        </div>
        {props.onRetry ? (
          <button
            type="button"
            className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            onClick={props.onRetry}
          >
            {props.retryLabel ?? '重試'}
          </button>
        ) : null}
      </div>
    );
  }

  if (props.isEmpty) {
    return (
      <div className="p-6 text-sm text-slate-600">{props.empty ?? '目前沒有資料'}</div>
    );
  }

  return <>{props.children}</>;
}
