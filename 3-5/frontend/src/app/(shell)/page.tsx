import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">API Platform & Key Management</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          註冊、建立 API Key，並透過 Gateway 呼叫受保護 API。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/keys"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            前往 Keys
          </Link>
          <Link
            href="/docs"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            查看 Docs
          </Link>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">快速開始</h2>
        <ol className="list-decimal pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <Link className="underline hover:no-underline" href="/register">
              註冊
            </Link>
            {' / '}
            <Link className="underline hover:no-underline" href="/login">
              登入
            </Link>
          </li>
          <li>到 Keys 建立一把新的 API Key（只顯示一次原文）</li>
          <li>
            使用 Bearer Token 呼叫：<span className="font-mono">/gateway/demo/ping</span>
          </li>
        </ol>
      </section>
    </div>
  );
}
