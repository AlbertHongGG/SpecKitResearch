import { ErrorDetails } from './ErrorDetails';

export function ErrorState(props: { title?: string; message?: string; error?: unknown }) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold">{props.title ?? '發生錯誤'}</div>
        <div className="mt-1 text-sm text-slate-700">{props.message ?? '請稍後再試。'}</div>
        {props.error ? <ErrorDetails error={props.error} /> : null}
      </div>
    </div>
  );
}
