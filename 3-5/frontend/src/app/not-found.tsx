import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg gap-4 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">找不到頁面</h1>
      <p className="text-zinc-600 dark:text-zinc-400">你要找的資源不存在或已被移除。</p>
      <div className="flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          回首頁
        </Link>
      </div>
    </div>
  );
}
