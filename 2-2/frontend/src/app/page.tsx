import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">線上課程平台</h1>
      <p className="text-slate-600">
        以文字、圖片與 PDF 內容為主的課程平台，購買後永久存取。
      </p>
      <Link
        href="/courses"
        className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white"
      >
        瀏覽課程
      </Link>
    </div>
  );
}
