import Link from 'next/link';

export default function NotFoundRoutePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-slate-700">找不到此頁面。</p>
      <div className="flex gap-3 text-sm">
        <Link href="/projects" className="text-slate-700 hover:text-slate-900">
          回專案
        </Link>
        <Link href="/" className="text-slate-700 hover:text-slate-900">
          回首頁
        </Link>
      </div>
    </div>
  );
}
