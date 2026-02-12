import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { Button } from './ui/Button'

export function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm font-semibold">
            Activity Platform
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/activities"
              className={({ isActive }: { isActive: boolean }) => (isActive ? 'font-semibold' : '')}
            >
              活動
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/me/activities"
                className={({ isActive }: { isActive: boolean }) => (isActive ? 'font-semibold' : '')}
              >
                我的活動
              </NavLink>
            )}

            {user?.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }: { isActive: boolean }) => (isActive ? 'font-semibold' : '')}
              >
                管理後台
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                <span className="hidden text-gray-600 sm:block">{user?.email}</span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    logout.mutate()
                  }}
                  disabled={logout.isPending}
                >
                  登出
                </Button>
              </>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }: { isActive: boolean }) => (isActive ? 'font-semibold' : '')}
              >
                登入
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
