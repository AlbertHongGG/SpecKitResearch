import { Link } from 'react-router-dom'

import { getAuthUser } from '../../auth/authStore'

export function AdminHomePage() {
  const user = getAuthUser()

  return (
    <div className="space-y-3">
      <div className="rounded border border-gray-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage users and services, and view platform summary reports.
        </p>
        {user ? <div className="mt-3 text-sm text-gray-700">Signed in as {user.email}</div> : null}
      </div>

      <div className="rounded border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Manage Users
          </Link>
          <Link
            to="/admin/services"
            className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Manage Services
          </Link>
          <Link
            to="/admin/reports"
            className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View Reports
          </Link>
        </div>
      </div>
    </div>
  )
}
