import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">403 沒有權限</h1>
      <p className="mt-2 text-gray-600">你沒有權限存取此頁面。</p>
      <div className="mt-6">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          回首頁
        </Link>
      </div>
    </div>
  );
}
