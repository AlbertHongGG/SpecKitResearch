import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">500 - 系統錯誤</h1>
      <p>系統暫時無法處理您的請求，請稍後重試。</p>
      <Link href="/" className="text-blue-600">
        返回首頁
      </Link>
    </div>
  );
}
