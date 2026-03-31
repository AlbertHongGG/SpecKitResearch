import { Link, useNavigate } from 'react-router-dom'

import { http } from '../api/http'
import { clearAuth, getAuthUser } from '../auth/authStore'

export function NavBar() {
  const navigate = useNavigate()
  const user = getAuthUser()

  const onLogout = async () => {
    try {
      await http<void>('/auth/logout', { method: 'POST' })
    } catch {
      // Ignore network/API failures on logout; client auth is cleared regardless.
    }
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm font-semibold text-gray-900">
            SmartBooking
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link to="/services" className="text-gray-700 hover:text-gray-900">
              Services
            </Link>
            {!user && (
              <>
                <Link to="/login" className="text-gray-700 hover:text-gray-900">
                  Login
                </Link>
                <Link to="/register" className="text-gray-700 hover:text-gray-900">
                  Register
                </Link>
              </>
            )}
            {user?.role === 'USER' && (
              <Link to="/me/bookings" className="text-gray-700 hover:text-gray-900">
                My Bookings
              </Link>
            )}
            {user?.role === 'PROVIDER' && (
              <Link to="/provider" className="text-gray-700 hover:text-gray-900">
                Provider
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="text-gray-700 hover:text-gray-900">
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="text-gray-600">{user.email}</span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
