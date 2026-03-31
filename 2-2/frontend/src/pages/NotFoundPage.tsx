import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="rounded border border-gray-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-gray-900">Not Found</h1>
      <p className="mt-2 text-sm text-gray-700">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
        Go back home
      </Link>
    </div>
  )
}
