import Link from 'next/link';

export default function Home() {
  return (
    <div className="rounded border p-6">
      <h1 className="text-xl font-semibold">API Key Platform</h1>
      <p className="mt-2 text-sm text-gray-600">
        Developer 可以建立 API keys（只顯示一次），並透過 Gateway 呼叫 upstream。
      </p>
      <div className="mt-4 flex gap-3">
        <Link className="rounded bg-black px-4 py-2 text-white" href="/keys">
          Go to Keys
        </Link>
        <Link className="rounded border px-4 py-2" href="/docs">
          View Docs
        </Link>
      </div>
    </div>
  );
}
