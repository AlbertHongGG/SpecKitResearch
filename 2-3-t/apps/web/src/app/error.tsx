'use client';

import Link from 'next/link';
import { safeText } from '../lib/sanitize';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const showDetails = process.env.NODE_ENV === 'development';

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-slate-900">發生錯誤</h1>
      <p className="mt-2 text-sm text-slate-700">請重試一次；若持續發生，可先回首頁。</p>

      {showDetails ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">錯誤訊息（開發模式）</div>
          <pre className="mt-2 whitespace-pre-wrap break-words">{safeText(error.message)}</pre>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2">
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => reset()}
        >
          重試
        </button>
        <Link
          href="/"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
        >
          回首頁
        </Link>
      </div>
    </div>
  );
}
