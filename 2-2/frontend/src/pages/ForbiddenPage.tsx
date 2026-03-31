import { Link } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-gray-900">Forbidden</h1>
      <p className="mt-2 text-sm text-gray-700">You do not have access to this page.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Go back home
      </Link>
    </div>
  )
}
