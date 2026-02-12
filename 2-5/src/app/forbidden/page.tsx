import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="rounded-lg border bg-white p-6">
        <div className="text-lg font-semibold">403 權限不足</div>
        <div className="mt-2 text-sm text-slate-600">你沒有權限存取此頁面。</div>
        <div className="mt-4 text-sm">
          <Link className="underline" href="/">
            回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
