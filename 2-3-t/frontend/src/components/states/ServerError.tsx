export function ServerError({ requestId }: { requestId?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6" role="alert" aria-live="polite">
      <h1 className="text-lg font-semibold">500 Server Error</h1>
      <p className="mt-2 text-sm text-gray-600">伺服器發生錯誤，請稍後再試。</p>
      {requestId ? (
        <p className="mt-2 text-xs text-gray-600">
          requestId: <span className="font-mono">{requestId}</span>
        </p>
      ) : null}
    </div>
  );
}
