import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">403 - 無權限</h1>
      <p>您沒有存取此頁面的權限。</p>
      <Link href="/" className="text-blue-600">
        返回首頁
      </Link>
    </div>
  );
}
