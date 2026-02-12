import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">404 找不到頁面</h1>
      <p className="mt-2 text-gray-600">此頁面不存在。</p>
      <div className="mt-6">
        <Link href="/courses" className="text-sm text-blue-600 hover:underline">
          前往課程列表
        </Link>
      </div>
    </div>
  );
}
