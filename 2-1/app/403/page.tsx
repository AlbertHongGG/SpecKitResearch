import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">沒有權限</h1>
      <p className="mt-2 text-slate-600">你沒有權限存取這個頁面。</p>
      <Link className="mt-6 inline-block rounded-md border border-slate-300 px-4 py-2" href="/">
        回首頁
      </Link>
    </div>
  );
}
