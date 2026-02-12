"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="rounded-lg border bg-white p-6">
        <div className="text-lg font-semibold">500 發生錯誤</div>
        <div className="mt-2 text-sm text-slate-600">系統遇到非預期錯誤，請稍後再試。</div>
        <button className="mt-4 rounded bg-slate-900 px-3 py-2 text-sm text-white" onClick={() => reset()}>
          重試
        </button>
      </div>
    </div>
  );
}
