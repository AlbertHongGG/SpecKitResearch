import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">找不到頁面</h1>
      <p className="mt-2 text-slate-600">你要找的資源不存在或無法存取。</p>
      <div className="mt-4">
        <Link href="/courses" className="text-sm text-slate-900 underline">
          回到課程列表
        </Link>
      </div>
    </main>
  );
}
