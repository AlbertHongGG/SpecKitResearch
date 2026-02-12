import { Link } from 'react-router-dom'
import { useAuth } from '../app/auth'

export function Nav() {
  const { state, logout } = useAuth()

  const role = state.user?.role

  return (
    <nav className="flex items-center gap-4 border-b px-4 py-3">
      <Link className="font-semibold" to="/">
        Helpdesk
      </Link>

      <div className="flex-1" />

      {state.status === 'authenticated' ? (
        <>
          {role === 'Customer' ? (
            <Link to="/tickets" className="text-sm">
              我的工單
            </Link>
          ) : null}
          {role === 'Agent' ? (
            <Link to="/agent/tickets" className="text-sm">
              工作台
            </Link>
          ) : null}
          {role === 'Admin' ? (
            <>
              <Link to="/admin/dashboard" className="text-sm">
                Dashboard
              </Link>
              <Link to="/admin/users" className="text-sm">
                Users
              </Link>
            </>
          ) : null}

          <button
            className="rounded border px-3 py-1 text-sm"
            type="button"
            onClick={() => {
              void logout()
            }}
          >
            登出
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="text-sm">
            登入
          </Link>
          <Link to="/register" className="text-sm">
            註冊
          </Link>
        </>
      )}
    </nav>
  )
}
