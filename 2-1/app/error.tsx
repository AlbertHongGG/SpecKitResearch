'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold text-slate-900">發生錯誤</h1>
          <p className="mt-2 text-slate-600">請重試或稍後再試。</p>
          <div className="mt-6 flex gap-3">
            <button className="rounded-md border border-slate-300 px-4 py-2" onClick={() => reset()}>
              重新載入
            </button>
            <Link className="rounded-md border border-slate-300 px-4 py-2" href="/">
              回首頁
            </Link>
          </div>
          {process.env.NODE_ENV !== 'production' ? (
            <pre className="mt-6 overflow-auto rounded bg-slate-50 p-4 text-xs text-slate-700">
              {String(error?.message || error)}
            </pre>
          ) : null}
        </div>
      </body>
    </html>
  );
}
