import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">沒有權限</h1>
      <p className="mt-2 text-sm text-slate-600">你沒有權限存取此頁面。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/" className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">
          回首頁
        </Link>
      </div>
    </div>
  )
}
