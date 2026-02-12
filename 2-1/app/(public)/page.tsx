import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">線上課程平台（非影音串流）</h1>
      <p className="text-slate-700">
        這是一個以文字/圖片/PDF 為主的內容型課程平台。你可以瀏覽課程、購買後永久存取，並追蹤學習進度。
      </p>
      <p>
        前往 <Link href="/courses">課程列表</Link>
      </p>
    </div>
  );
}
