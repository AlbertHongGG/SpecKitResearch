'use client';

import { useState } from 'react';

export function ApiKeyPlaintextCard({
  plaintext,
  onDismiss
}: {
  plaintext: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="font-semibold">API Key（只顯示一次）</div>
          <div className="text-sm opacity-90">請立即複製並妥善保存；關閉後無法再次取得原文。</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg px-2 py-1 text-sm hover:bg-amber-100 dark:hover:bg-amber-900/30"
        >
          關閉
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="break-all rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm dark:border-amber-900/50 dark:bg-black">
          {plaintext}
        </code>
        <button
          type="button"
          className="rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-300"
          onClick={async () => {
            await navigator.clipboard.writeText(plaintext);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? '已複製' : '複製'}
        </button>
      </div>
    </div>
  );
}
