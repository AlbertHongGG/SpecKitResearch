import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">找不到頁面</h1>
      <p className="mt-2 text-sm text-gray-600">路由不存在。</p>
      <Link to="/" className="mt-4 inline-block text-sm font-medium text-blue-700">
        回首頁
      </Link>
    </div>
  )
}
