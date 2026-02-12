import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">需要登入</h1>
      <p className="mt-2 text-slate-600">此頁面需要登入後才能存取。</p>
      <div className="mt-4">
        <Link href="/login" className="text-sm text-slate-900 underline">
          前往登入
        </Link>
      </div>
    </main>
  );
}
