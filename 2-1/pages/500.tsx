import Link from 'next/link';

export default function Custom500() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">伺服器錯誤</h1>
      <p className="mt-2 text-slate-600">系統暫時無法處理你的請求。</p>
      <Link className="mt-6 inline-block rounded-md border border-slate-300 px-4 py-2" href="/">
        回首頁
      </Link>
    </div>
  );
}
