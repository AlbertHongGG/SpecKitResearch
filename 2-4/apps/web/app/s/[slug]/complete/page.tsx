'use client';

import { useSearchParams } from 'next/navigation';

export default function CompletePage() {
  const params = useSearchParams();
  const responseHash = params.get('response_hash');

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Thanks!</h1>
      <p className="mt-2 text-sm text-zinc-600">Your response has been submitted.</p>

      {responseHash ? (
        <div className="mt-6 rounded-md border border-zinc-200 bg-white p-4">
          <div className="text-sm text-zinc-700">response_hash</div>
          <div className="mt-1 break-all font-mono text-sm">{responseHash}</div>
        </div>
      ) : null}
    </main>
  );
}
