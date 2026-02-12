import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">找不到頁面</h1>
      <p className="mt-2 text-sm text-slate-600">你要找的頁面不存在，或已被移除。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/" className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">
          回首頁
        </Link>
      </div>
    </div>
  )
}
