import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">404 - 找不到頁面</h1>
      <p>請確認網址是否正確。</p>
      <Link href="/" className="text-blue-600">
        返回首頁
      </Link>
    </div>
  );
}
