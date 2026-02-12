import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">找不到頁面</h1>
      <p className="mt-2 text-slate-600">你要找的內容可能已被移除或不存在。</p>
      <Link className="mt-6 inline-block rounded-md border border-slate-300 px-4 py-2" href="/">
        回首頁
      </Link>
    </div>
  );
}
