import Link from 'next/link';

export default function Error500Page() {
  return (
    <div className="mx-auto grid max-w-lg gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">500</h1>
      <p className="text-zinc-600 dark:text-zinc-400">系統發生錯誤，請稍後再試。</p>
      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          回首頁
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          登入
        </Link>
      </div>
    </div>
  );
}
