import { Link } from 'react-router-dom'

export function ServerErrorPage(props: { title?: string; description?: string }) {
  return (
    <div className="rounded border bg-white p-6">
      <h1 className="text-xl font-semibold">{props.title ?? '系統發生錯誤'}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {props.description ?? '請稍後再試，或重新整理頁面。'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          onClick={() => window.location.reload()}
        >
          重新整理
        </button>
        <Link to="/" className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800">
          回首頁
        </Link>
      </div>
    </div>
  )
}
