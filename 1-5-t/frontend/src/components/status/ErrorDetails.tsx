import { ApiError } from '../../api/http';

export function ErrorDetails(props: { error: unknown }) {
  const debug = new URLSearchParams(window.location.search).has('debug');
  if (!debug) return null;

  if (props.error instanceof ApiError) {
    return (
      <div className="mt-3 rounded-md bg-slate-100 p-3 text-left text-xs text-slate-700">
        <div>status: {props.error.status}</div>
        <div>code: {props.error.code}</div>
        {props.error.requestId ? <div>requestId: {props.error.requestId}</div> : null}
      </div>
    );
  }
  return null;
}
