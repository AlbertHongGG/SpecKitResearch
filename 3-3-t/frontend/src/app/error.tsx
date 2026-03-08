"use client";

import Link from 'next/link';

export default function GlobalError() {
  return (
    <main className="container-page space-y-3">
      <h1 className="text-2xl font-semibold">5xx Server Error</h1>
      <p>發生伺服器錯誤，請稍後重試。</p>
      <Link className="rounded border px-3 py-1" href="/pricing">Go Pricing</Link>
    </main>
  );
}
