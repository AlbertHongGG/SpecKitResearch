import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">內容型線上課程平台</h1>
      <p className="text-gray-600">提供課程行銷頁、購買、閱讀、教師與管理後台。</p>
      <div className="flex gap-3">
        <Link href="/courses" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90">
          瀏覽課程
        </Link>
        <Link href="/login" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-gray-50">
          登入
        </Link>
      </div>
    </div>
  );
}
